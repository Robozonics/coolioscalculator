import React, { useState } from 'react';

const conversionCategories = {
  Length: {
    Meter: 1,
    Kilometer: 1000,
    Centimeter: 0.01,
    Millimeter: 0.001,
    Mile: 1609.34,
    Yard: 0.9144,
    Foot: 0.3048,
    Inch: 0.0254,
  },
  Weight: {
    Kilogram: 1,
    Gram: 0.001,
    Milligram: 0.000001,
    MetricTon: 1000,
    LongTon: 1016.05,
    ShortTon: 907.185,
    Pound: 0.453592,
    Ounce: 0.0283495,
  },
  Temperature: {
    Celsius: 'C',
    Fahrenheit: 'F',
    Kelvin: 'K'
  }
};

type Category = keyof typeof conversionCategories;

const UnitConverter: React.FC = () => {
  const [category, setCategory] = useState<Category>('Length');
  const [fromUnit, setFromUnit] = useState('Meter');
  const [toUnit, setToUnit] = useState('Foot');
  
  const [fromVal, setFromVal] = useState('1');
  const [toVal, setToVal] = useState('3.28084');

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value as Category;
    setCategory(cat);
    const units = Object.keys(conversionCategories[cat]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
    setFromVal('');
    setToVal('');
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
      
      return res.toPrecision(7).replace(/(?:\.0+|(\.\d+?)0+)$/, "$1");
    }

    const rates = conversionCategories[cat] as Record<string, number>;
    const baseVal = num * rates[from];
    const finalVal = baseVal / rates[to];
    
    return finalVal.toPrecision(7).replace(/(?:\.0+|(\.\d+?)0+)$/, "$1");
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

  return (
    <div className="converter-container">
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <select 
          value={category} 
          onChange={handleCategoryChange}
          style={{ background: '#333', color: 'white', padding: '10px 20px', borderRadius: 20, border: 'none', fontSize: 18 }}
        >
          {Object.keys(conversionCategories).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <div className="unit-row">
          <select className="unit-select" value={fromUnit} onChange={(e) => {
            setFromUnit(e.target.value);
            setToVal(convert(fromVal, e.target.value, toUnit, category));
          }}>
            {Object.keys(conversionCategories[category]).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input 
            type="number" 
            className="unit-val" 
            value={fromVal} 
            onChange={handleFromChange}
            placeholder="0"
          />
        </div>

        <div className="unit-row">
          <select className="unit-select" value={toUnit} onChange={(e) => {
            setToUnit(e.target.value);
            setToVal(convert(fromVal, fromUnit, e.target.value, category));
          }}>
            {Object.keys(conversionCategories[category]).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input 
            type="number" 
            className="unit-val" 
            value={toVal} 
            onChange={handleToChange}
            placeholder="0"
          />
        </div>
      </div>
      
      {/* Spacer for bottom */}
      <div style={{ height: '30vh' }}></div>
    </div>
  );
};

export default UnitConverter;
