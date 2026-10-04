import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';

const conversionCategories = {
  Length: {
    Meter: 1, Kilometer: 1000, Centimeter: 0.01, Millimeter: 0.001, Mile: 1609.34, Yard: 0.9144, Foot: 0.3048, Inch: 0.0254,
  },
  Mass: {
    Kilogram: 1, Gram: 0.001, Milligram: 0.000001, MetricTon: 1000, Pound: 0.453592, Ounce: 0.0283495,
  },
  Temperature: {
    Celsius: 'C', Fahrenheit: 'F', Kelvin: 'K'
  },
  Speed: {
    'Meter per second': 1, 'Kilometer per hour': 0.277778, 'Mile per hour': 0.44704, 'Knot': 0.514444
  },
  Area: {
    'Square Meter': 1, 'Square Kilometer': 1000000, 'Square Foot': 0.092903, 'Acre': 4046.86, 'Hectare': 10000
  },
  Time: {
    Second: 1, Minute: 60, Hour: 3600, Day: 86400, Week: 604800, Month: 2629800, Year: 31557600
  }
};

type Category = keyof typeof conversionCategories;

const UnitConverter = () => {
  const [category, setCategory] = useState<Category>('Length');
  const [fromUnit, setFromUnit] = useState('Meter');
  const [toUnit, setToUnit] = useState('Foot');
  
  const [fromVal, setFromVal] = useState('1');
  const [toVal, setToVal] = useState('3.28084');

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    const units = Object.keys(conversionCategories[cat]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
    setFromVal('1');
    setToVal(convert('1', units[0], units[1] || units[0], cat));
  };

  const convert = (val: string, from: string, to: string, cat: Category) => {
    if (!val || isNaN(Number(val))) return '';
    const num = parseFloat(val);

    if (cat === 'Temperature') {
      let c = 0;
      if (from === 'Celsius') c = num;
      if (from === 'Fahrenheit') c = (num - 32) * 5/9;
      if (from === 'Kelvin') c = num - 273.15;

      let res = 0;
      if (to === 'Celsius') res = c;
      if (to === 'Fahrenheit') res = (c * 9/5) + 32;
      if (to === 'Kelvin') res = c + 273.15;
      
      return parseFloat(res.toPrecision(7)).toString();
    }

    const rates = conversionCategories[cat] as Record<string, number>;
    const baseVal = num * rates[from];
    const finalVal = baseVal / rates[to];
    
    return parseFloat(finalVal.toPrecision(7)).toString();
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFromVal(v);
    setToVal(convert(v, fromUnit, toUnit, category));
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setToVal(v);
    setFromVal(convert(v, toUnit, fromUnit, category));
  };

  const swapUnits = () => {
    const tempUnit = fromUnit;
    const tempVal = fromVal;
    setFromUnit(toUnit);
    setToUnit(tempUnit);
    setFromVal(toVal);
    setToVal(tempVal);
  };

  return (
    <div className="google-converter-card">
      {/* Category Tabs */}
      <div className="google-category-chips">
        {(Object.keys(conversionCategories) as Category[]).map(c => (
          <button
            key={c}
            className={`google-chip ${category === c ? 'active' : ''}`}
            onClick={() => handleCategoryChange(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Main Conversion Grid */}
      <div className="converter-boxes-row">
        {/* From Box */}
        <div className="google-unit-card">
          <div className="unit-card-label">From</div>
          <select 
            className="google-select" 
            value={fromUnit} 
            onChange={(e) => {
              setFromUnit(e.target.value);
              setToVal(convert(fromVal, e.target.value, toUnit, category));
            }}
          >
            {Object.keys(conversionCategories[category]).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input 
            type="number" 
            className="google-unit-input" 
            value={fromVal} 
            onChange={handleFromChange}
            placeholder="0"
          />
        </div>

        {/* Swap button */}
        <button className="google-swap-btn" onClick={swapUnits} title="Swap units">
          <ArrowLeftRight size={18} />
        </button>

        {/* To Box */}
        <div className="google-unit-card">
          <div className="unit-card-label">To</div>
          <select 
            className="google-select" 
            value={toUnit} 
            onChange={(e) => {
              setToUnit(e.target.value);
              setToVal(convert(fromVal, fromUnit, e.target.value, category));
            }}
          >
            {Object.keys(conversionCategories[category]).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input 
            type="number" 
            className="google-unit-input" 
            value={toVal} 
            onChange={handleToChange}
            placeholder="0"
          />
        </div>
      </div>

      {/* Summary Formula */}
      <div className="converter-summary">
        1 {fromUnit} = {convert('1', fromUnit, toUnit, category)} {toUnit}
      </div>
    </div>
  );
};

export default UnitConverter;
