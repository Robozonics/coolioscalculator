import * as math from 'mathjs';

export interface VariableSymbol {
  name: string;
  value: any;
  expression: string;
  dependencies: string[];
  dependents: string[];
  error?: string;
  order: number;
}

export interface EvaluationResult {
  raw: string;
  evaluated: string;
  isAssignment: boolean;
  assignedVar?: string;
  assignedVal?: any;
  dependencies: string[];
  error?: string;
  isGraphable2D?: boolean;
  graph2D?: {
    dependentVar: string;
    independentVar: string;
    expression: string;
    functions: Array<{ name: string; expr: string; color: string }>;
  };
  isGraphable3D?: boolean;
  graph3D?: {
    dependentVar: string;
    varX: string;
    varY: string;
    expression: string;
  };
}

export interface GraphPoint {
  x: number;
  y: number;
}

export interface CriticalPoint {
  x: number;
  y: number;
  type: 'root' | 'minimum' | 'maximum';
  label: string;
}

export class MathEngine {
  private symbolTable: Map<string, VariableSymbol> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.symbolTable.clear();
    // Register standard math constants
    this.symbolTable.set('pi', {
      name: 'pi',
      value: Math.PI,
      expression: '3.141592653589793',
      dependencies: [],
      dependents: [],
      order: -2
    });
    this.symbolTable.set('e', {
      name: 'e',
      value: Math.E,
      expression: '2.718281828459045',
      dependencies: [],
      dependents: [],
      order: -1
    });
  }

  public getSymbolTable(): Map<string, VariableSymbol> {
    return new Map(this.symbolTable);
  }

  // Pre-process implicit multiplication: e.g. "4x" -> "4 * x", "2pi" -> "2 * pi", "3(x+1)" -> "3 * (x+1)"
  public normalizeExpression(expr: string): string {
    let s = expr.trim();
    // Normalize unicode operators
    s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    
    // Number followed immediately by variable or function: e.g. 4x -> 4 * x
    s = s.replace(/(\d+)([a-zA-Z_]\w*)/g, '$1 * $2');
    // Number followed by parenthesis: e.g. 4(x) -> 4 * (x)
    s = s.replace(/(\d+)\s*\(/g, '$1 * (');
    // Closing parenthesis followed by variable or parenthesis: (a)(b) -> (a) * (b)
    s = s.replace(/\)\s*\(/g, ') * (');
    s = s.replace(/\)\s*([a-zA-Z0-9_])/g, ') * $1');

    return s;
  }

  // Extract variable identifiers from an expression string
  public extractVariables(expr: string): string[] {
    const knownFunctions = new Set([
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
      'sqrt', 'cbrt', 'log', 'log10', 'ln', 'exp', 'abs', 'round', 'floor', 'ceil',
      'min', 'max', 'sum', 'mod', 'pi', 'e'
    ]);

    const vars = new Set<string>();
    try {
      const parsed = math.parse(this.normalizeExpression(expr));
      parsed.traverse((node: any) => {
        if (node.isSymbolNode && !knownFunctions.has(node.name)) {
          vars.add(node.name);
        }
      });
    } catch {
      // Regex fallback
      const matches = expr.match(/[a-zA-Z_]\w*/g) || [];
      matches.forEach(m => {
        if (!knownFunctions.has(m) && !['true', 'false', 'null', 'Infinity', 'NaN'].includes(m)) {
          vars.add(m);
        }
      });
    }

    return Array.from(vars);
  }

  // Detect Circular Dependencies in the DAG
  public detectCycle(startVar: string, targetVar: string, visited = new Set<string>()): boolean {
    if (startVar === targetVar) return true;
    if (visited.has(startVar)) return false;
    visited.add(startVar);

    const symbol = this.symbolTable.get(startVar);
    if (!symbol) return false;

    for (const dep of symbol.dependencies) {
      if (this.detectCycle(dep, targetVar, new Set(visited))) {
        return true;
      }
    }
    return false;
  }

  // Evaluate a single line of input in document context
  public evaluateLine(line: string, orderIndex = 0): EvaluationResult {
    let clean = line.trim();
    if (!clean) {
      return { raw: line, evaluated: '', isAssignment: false, dependencies: [] };
    }

    // Strip trailing equals if present
    const hasTrailingEquals = clean.endsWith('=');
    if (hasTrailingEquals) {
      clean = clean.slice(0, -1).trim();
    }

    // Check for 3D function pattern: e.g. z = sin(x) * cos(y)
    // Only graph if not an evaluation request (hasTrailingEquals is false) and RHS variables are unbound
    const match3D = clean.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (match3D && !hasTrailingEquals) {
      const lhs = match3D[1];
      const rhs = match3D[2].trim();
      const rhsVars = this.extractVariables(rhs).filter(v => v !== lhs && v !== 'pi' && v !== 'e');
      const unboundVars = rhsVars.filter(v => !this.symbolTable.has(v));
      
      // If exactly 2 unbound variables, it's an explicit 3D surface: z = f(x, y)
      if (unboundVars.length === 2 && (unboundVars.includes('x') || unboundVars.includes('y') || unboundVars.length === 2)) {
        return {
          raw: line,
          evaluated: `3D Surface: ${lhs}(${unboundVars[0]}, ${unboundVars[1]})`,
          isAssignment: false,
          dependencies: unboundVars,
          isGraphable3D: true,
          graph3D: {
            dependentVar: lhs,
            varX: unboundVars[0],
            varY: unboundVars[1],
            expression: this.normalizeExpression(rhs)
          }
        };
      }

      // If exactly 1 unbound variable (e.g. y = 2*x^2 - 4*x - 6), it's a 2D function
      if (unboundVars.length === 1) {
        const indep = unboundVars[0];
        return {
          raw: line,
          evaluated: `2D Plot: ${lhs}(${indep})`,
          isAssignment: false,
          dependencies: [indep],
          isGraphable2D: true,
          graph2D: {
            dependentVar: lhs,
            independentVar: indep,
            expression: this.normalizeExpression(rhs),
            functions: [{ name: lhs, expr: this.normalizeExpression(rhs), color: '#007aff' }]
          }
        };
      }
    }

    // Check for variable assignment: e.g. "radius = 14", "price = 45.50"
    const assignmentMatch = clean.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    let isAssignment = false;
    let assignedVar: string | undefined;
    let exprToEval = clean;

    if (assignmentMatch) {
      isAssignment = true;
      assignedVar = assignmentMatch[1];
      exprToEval = assignmentMatch[2].trim();
    }

    // Check for unit conversion syntax: e.g. "50 m in ft", "100 km to mi", "100 degC to degF"
    if (!exprToEval.includes('{') && /\b(to|in)\b/.test(exprToEval)) {
      const unitExpr = exprToEval.replace(/\bin\b/g, 'to');
      try {
        const unitRes = math.evaluate(unitExpr);
        if (unitRes && typeof unitRes === 'object' && ('value' in unitRes || 'units' in unitRes)) {
          const formatted = (unitRes as any).format ? (unitRes as any).format({ precision: 5 }) : unitRes.toString();
          return {
            raw: line,
            evaluated: formatted,
            isAssignment,
            assignedVar,
            dependencies: []
          };
        }
      } catch {
        // Fall back to standard evaluation
      }
    }

    // Check for equality or inequality logic: e.g. "7=9", "5 > 3", "x in {1,2,3}"
    if (!isAssignment && (clean.includes('==') || clean.includes('!=') || clean.includes('>') || clean.includes('<') || clean.includes(' in '))) {
      return this.evaluateLogic(clean);
    }

    // Check if it's a single equality test like "7 = 9"
    const singleEqualsLogic = clean.match(/^([0-9.\s+\-*/()]+)\s*=\s*([0-9.\s+\-*/()]+)$/);
    if (singleEqualsLogic && !isAssignment) {
      try {
        const leftVal = math.evaluate(this.normalizeExpression(singleEqualsLogic[1]));
        const rightVal = math.evaluate(this.normalizeExpression(singleEqualsLogic[2]));
        const isEqual = Math.abs(leftVal - rightVal) < 1e-9;
        return {
          raw: line,
          evaluated: isEqual ? 'true' : 'false',
          isAssignment: false,
          dependencies: []
        };
      } catch {
        // Continue standard evaluation
      }
    }

    // Extract dependencies for the expression
    const deps = this.extractVariables(exprToEval).filter(v => v !== 'pi' && v !== 'e');

    // Circular dependency check
    if (isAssignment && assignedVar) {
      for (const d of deps) {
        if (d === assignedVar || this.detectCycle(d, assignedVar)) {
          return {
            raw: line,
            evaluated: 'Error: Circular dependency',
            isAssignment: true,
            assignedVar,
            dependencies: deps,
            error: `Circular dependency detected: ${assignedVar} ⇄ ${d}`
          };
        }
      }
    }

    // Check for undefined variables
    const scope: Record<string, any> = {};
    for (const [k, v] of this.symbolTable.entries()) {
      scope[k] = v.value;
    }

    for (const d of deps) {
      if (!(d in scope)) {
        return {
          raw: line,
          evaluated: `undefined variable: ${d}`,
          isAssignment,
          assignedVar,
          dependencies: deps,
          error: `undefined variable: ${d}`
        };
      }
    }

    // Check for unit conversion syntax: e.g. "50 m in ft", "100 km to mi", "100 degC to degF"
    if (!exprToEval.includes('{') && /\b(to|in)\b/.test(exprToEval)) {
      const unitExpr = exprToEval.replace(/\bin\b/g, 'to');
      try {
        const unitRes = math.evaluate(unitExpr);
        if (unitRes && typeof unitRes === 'object' && 'value' in unitRes) {
          return {
            raw: line,
            evaluated: (unitRes as any).format ? (unitRes as any).format({ precision: 5 }) : unitRes.toString(),
            isAssignment,
            assignedVar,
            dependencies: []
          };
        }
      } catch {
        // Fall back to standard evaluation
      }
    }

    // Evaluate expression with scope
    try {
      const normalized = this.normalizeExpression(exprToEval);
      const res = math.evaluate(normalized, scope);

      let formatted = '';
      if (res && typeof res === 'object' && 'value' in res && 'unit' in res) {
        formatted = (res as any).format ? (res as any).format({ precision: 5 }) : res.toString();
      } else if (typeof res === 'number') {
        if (isNaN(res)) formatted = 'undefined';
        else if (!isFinite(res)) formatted = 'Infinity';
        else if (Math.abs(res) < 1e-12 && Math.abs(res) > 0) formatted = '0';
        else if (Number.isInteger(res)) formatted = res.toString();
        else formatted = parseFloat(res.toPrecision(10)).toString();
      } else if (typeof res === 'boolean') {
        formatted = res ? 'true' : 'false';
      } else if (res && typeof res === 'object' && 'im' in res && 're' in res) {
        // Complex number
        formatted = `${res.re} + ${res.im}i`;
      } else {
        formatted = String(res);
      }

      // Update symbol table if assignment
      if (isAssignment && assignedVar) {
        const prevSym = this.symbolTable.get(assignedVar);
        const dependents = prevSym ? prevSym.dependents : [];
        this.symbolTable.set(assignedVar, {
          name: assignedVar,
          value: res,
          expression: exprToEval,
          dependencies: deps,
          dependents,
          order: orderIndex
        });

        // Link dependencies
        deps.forEach(d => {
          const sym = this.symbolTable.get(d);
          if (sym && !sym.dependents.includes(assignedVar!)) {
            sym.dependents.push(assignedVar!);
          }
        });
      }

      return {
        raw: line,
        evaluated: formatted,
        isAssignment,
        assignedVar,
        assignedVal: res,
        dependencies: deps
      };
    } catch (err: any) {
      return {
        raw: line,
        evaluated: 'Error: Invalid expression',
        isAssignment,
        assignedVar,
        dependencies: deps,
        error: err.message || 'Syntax error'
      };
    }
  }

  // Evaluate logic expressions (inequalities, set membership)
  private evaluateLogic(expr: string): EvaluationResult {
    try {
      // Set membership: e.g. "x in {1, 2, 3}"
      const inMatch = expr.match(/^(.+?)\s+in\s+\{(.+?)\}$/);
      if (inMatch) {
        const itemVal = math.evaluate(this.normalizeExpression(inMatch[1]));
        const setVals = inMatch[2].split(',').map(s => math.evaluate(this.normalizeExpression(s.trim())));
        const has = setVals.some(v => Math.abs(v - itemVal) < 1e-9);
        return {
          raw: expr,
          evaluated: has ? 'true' : 'false',
          isAssignment: false,
          dependencies: []
        };
      }

      // Standard logical comparison
      const normalized = expr.replace(/==/g, '==').replace(/!=/g, '!=');
      const res = math.evaluate(normalized);
      return {
        raw: expr,
        evaluated: Boolean(res) ? 'true' : 'false',
        isAssignment: false,
        dependencies: []
      };
    } catch {
      return {
        raw: expr,
        evaluated: 'false',
        isAssignment: false,
        dependencies: []
      };
    }
  }

  // Generate 2D graph samples, roots (zeros), and extrema
  public generateGraph2DData(
    expr: string,
    xMin = -10,
    xMax = 10,
    step = 0.2
  ): { points: GraphPoint[]; criticalPoints: CriticalPoint[] } {
    const points: GraphPoint[] = [];
    const criticalPoints: CriticalPoint[] = [];
    const compiled = math.compile(this.normalizeExpression(expr));

    let prevY: number | null = null;
    let prevSlope: number | null = null;

    for (let x = xMin; x <= xMax; x += step) {
      try {
        const y = compiled.evaluate({ x });
        if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
          const roundedX = Number(x.toFixed(2));
          const roundedY = Number(y.toFixed(2));
          points.push({ x: roundedX, y: roundedY });

          // Detect roots (sign change or near zero)
          if (Math.abs(roundedY) < 0.05) {
            criticalPoints.push({
              x: roundedX,
              y: 0,
              type: 'root',
              label: `Root: (${roundedX}, 0)`
            });
          } else if (prevY !== null && ((prevY < 0 && roundedY > 0) || (prevY > 0 && roundedY < 0))) {
            const approxRoot = Number((x - step / 2).toFixed(2));
            criticalPoints.push({
              x: approxRoot,
              y: 0,
              type: 'root',
              label: `Root ≈ (${approxRoot}, 0)`
            });
          }

          // Detect local extrema (slope sign change)
          if (prevY !== null) {
            const currentSlope = (roundedY - prevY) / step;
            if (prevSlope !== null) {
              if (prevSlope > 0.01 && currentSlope < -0.01) {
                criticalPoints.push({
                  x: roundedX,
                  y: roundedY,
                  type: 'maximum',
                  label: `Max: (${roundedX}, ${roundedY})`
                });
              } else if (prevSlope < -0.01 && currentSlope > 0.01) {
                criticalPoints.push({
                  x: roundedX,
                  y: roundedY,
                  type: 'minimum',
                  label: `Min: (${roundedX}, ${roundedY})`
                });
              }
            }
            prevSlope = currentSlope;
          }

          prevY = roundedY;
        }
      } catch {
        // Skip domain errors (e.g. sqrt of negative)
      }
    }

    return { points, criticalPoints };
  }

  // Generate 3D surface mesh vertices: z = f(x, y)
  public generate3DSurfaceData(
    expr: string,
    range = 5,
    resolution = 30
  ): { vertices: number[]; indices: number[]; colors: number[] } {
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const step = (range * 2) / resolution;
    const compiled = math.compile(this.normalizeExpression(expr));

    const grid: number[][] = [];
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i <= resolution; i++) {
      grid[i] = [];
      const x = -range + i * step;
      for (let j = 0; j <= resolution; j++) {
        const y = -range + j * step;
        let z = 0;
        try {
          const val = compiled.evaluate({ x, y });
          if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
            z = val;
          }
        } catch {
          z = 0;
        }
        grid[i][j] = z;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    const zSpan = Math.max(maxZ - minZ, 0.001);

    // Build vertex positions and elevation colors
    for (let i = 0; i <= resolution; i++) {
      const x = -range + i * step;
      for (let j = 0; j <= resolution; j++) {
        const y = -range + j * step;
        const z = grid[i][j];
        vertices.push(x, z, y);

        // Color gradient based on normalized z
        const normZ = (z - minZ) / zSpan;
        const r = normZ;
        const g = 0.5 * (1 - Math.abs(normZ - 0.5) * 2);
        const b = 1 - normZ;
        colors.push(r, g, b);
      }
    }

    // Build triangular faces
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = i * (resolution + 1) + j;
        const b = (i + 1) * (resolution + 1) + j;
        const c = (i + 1) * (resolution + 1) + (j + 1);
        const d = i * (resolution + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return { vertices, indices, colors };
  }
}

export const mathEngine = new MathEngine();
