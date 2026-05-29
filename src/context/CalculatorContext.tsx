import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import type { PowerScrewInput, PowerScrewResults } from '@/modules/powerScrew/types';
import type { TensionJointInput, TensionJointResults } from '@/modules/tensionJoint/types';
import type { ShearJointInput, ShearJointResults }   from '@/modules/shearJoint/types';
import { loadThreadTables, getAllThreads } from '@/utils/threadTables';
import { loadMaterialTables, getAllISOClasses, getAllSAEGrades, POWER_SCREW_MATERIALS } from '@/utils/materialDatabase';
import type { PowerScrewSweepResult } from '@/modules/powerScrew/design';
import type { ShearJointSweepResult, ShearAreaMode } from '@/modules/shearJoint/design';

export type ActiveTab = 'power' | 'tension' | 'shear';

/** Factores de seguridad objetivo para comparar con el resultado del diseño. */
export interface TargetSafetyFactors {
  /** Factor de carga mínimo deseado (np). Por defecto 2. */
  np: number;
  /** Factor de separación mínimo deseado (n0). Por defecto 1.5. */
  n0: number;
  /** Factor de fatiga mínimo deseado (nf). Por defecto 2. */
  nf: number;
  /** Factor de cortante mínimo (juntas a cortante). Por defecto 2. */
  nShear: number;
  /** Factor de aplastamiento mínimo. Por defecto 2. */
  nBearing: number;
  /** Factor de Von Mises / fluencia mínimo. Por defecto 2. */
  nYield: number;
}

interface CalculatorState {
  activeTab:      ActiveTab;
  unitSystem:     'SI' | 'imperial';
  loading:        boolean;
  error:          string | null;
  tablesLoaded:   boolean;

  powerInputs:   Partial<PowerScrewInput>;
  tensionInputs: Partial<TensionJointInput>;
  shearInputs:   Partial<ShearJointInput>;

  powerResults?:   PowerScrewResults;
  tensionResults?: TensionJointResults;
  shearResults?:   ShearJointResults;

  /** Modo "Diseño automático" (barrido iterativo) activo por pestaña. */
  autoMode: { power: boolean; shear: boolean };
  /** Opciones del barrido configurables desde la UI. */
  sweepOptions: { shearStandard: 'iso' | 'unc'; shearAreaMode: ShearAreaMode };
  /** Resultados del barrido iterativo. */
  powerSweep?: PowerScrewSweepResult;
  shearSweep?: ShearJointSweepResult;

  /** Factores de seguridad objetivo que el usuario puede ajustar. */
  targetSafetyFactors: TargetSafetyFactors;

  validationErrors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
}

type Action =
  | { type: 'SET_TAB';         tab: ActiveTab }
  | { type: 'SET_UNIT';        system: 'SI' | 'imperial' }
  | { type: 'SET_LOADING';     loading: boolean }
  | { type: 'SET_ERROR';       error: string | null }
  | { type: 'TABLES_LOADED' }
  | { type: 'UPDATE_POWER';    inputs: Partial<PowerScrewInput> }
  | { type: 'UPDATE_TENSION';  inputs: Partial<TensionJointInput> }
  | { type: 'UPDATE_SHEAR';    inputs: Partial<ShearJointInput> }
  | { type: 'SET_RESULTS';     tab: ActiveTab; results: any }
  | { type: 'SET_SWEEP';       tab: 'power' | 'shear'; sweep: any }
  | { type: 'SET_AUTO_MODE';   tab: 'power' | 'shear'; on: boolean }
  | { type: 'SET_SWEEP_OPTIONS'; options: Partial<CalculatorState['sweepOptions']> }
  | { type: 'SET_VALIDATION';  errors: CalculatorState['validationErrors'] }
  | { type: 'SET_TARGETS';     targets: Partial<TargetSafetyFactors> }
  | { type: 'RESET' };

const defaultState: CalculatorState = {
  activeTab:    'power',
  unitSystem:   'SI',
  loading:      false,
  error:        null,
  tablesLoaded: false,

  powerInputs: {
    threadType:         'acme',
    majorDiameter:      32,
    pitch:              4,
    numberOfStarts:     2,
    axialLoad:          6400,
    frictionCoefficient: 0.08,
    hasCollar:          true,
    collarDiameter:     40,
    collarFriction:     0.08,
    engagedThreads:     2,
    unitSystem:         'SI',
  },

  tensionInputs: {
    boltDiameter:           12,
    pitch:                  1.75,
    tensileArea:            84.3,
    grip:                   30,
    unthreadedLengthInGrip: 12,
    threadedLengthInGrip:   18,
    memberMaterial:         'steel',
    memberE:                207,
    wilemanA:               0.78715,
    wilemanB:               0.62873,
    kmMethod:               'cornwell' as const,
    cornwellPlates: [
      { E_GPa: 207, thickness: 30, label: 'Placa inferior (acero)' },
    ],
    permanence:             'reusable',
    K:                      0.20,
    externalLoad:           15000,
    loadType:               'static',
    unitSystem:             'SI',
  },

  shearInputs: {
    bolts: [
      { id: 'A', x:   0, y:  40 },
      { id: 'B', x:   0, y: -40 },
      { id: 'C', x:  80, y:  40 },
      { id: 'D', x:  80, y: -40 },
    ],
    boltDiameter:   16,
    shearArea:      157,
    doubleShear:    false,
    boltSp:         600,
    boltSy:         660,
    boltSut:        830,
    V:              18000,
    Vx:             0,
    Vy:            -1,
    applicationX:   300,
    applicationY:   0,
    plateThickness: 10,
    plateSy:        370,
    plateSut:       440,
    plateWidth:     140,
    unitSystem:     'SI',
  },

  autoMode:     { power: false, shear: false },
  sweepOptions: { shearStandard: 'iso', shearAreaMode: 'thread' },

  targetSafetyFactors: {
    np: 2.0,
    n0: 1.5,
    nf: 2.0,
    nShear: 2.0,
    nBearing: 2.0,
    nYield: 2.0,
  },

  validationErrors: [],
};

function reducer(state: CalculatorState, action: Action): CalculatorState {
  switch (action.type) {
    case 'SET_TAB':        return { ...state, activeTab: action.tab, error: null };
    case 'SET_UNIT':       return { ...state, unitSystem: action.system };
    case 'SET_LOADING':    return { ...state, loading: action.loading };
    case 'SET_ERROR':      return { ...state, error: action.error, loading: false };
    case 'TABLES_LOADED':  return { ...state, tablesLoaded: true };
    case 'UPDATE_POWER':   return { ...state, powerInputs:   { ...state.powerInputs,   ...action.inputs } };
    case 'UPDATE_TENSION': return { ...state, tensionInputs: { ...state.tensionInputs, ...action.inputs } };
    case 'UPDATE_SHEAR':   return { ...state, shearInputs:   { ...state.shearInputs,   ...action.inputs } };
    case 'SET_RESULTS':
      return {
        ...state,
        loading: false,
        error:   null,
        powerResults:   action.tab === 'power'   ? action.results : state.powerResults,
        tensionResults: action.tab === 'tension' ? action.results : state.tensionResults,
        shearResults:   action.tab === 'shear'   ? action.results : state.shearResults,
      };
    case 'SET_SWEEP':
      return {
        ...state,
        loading: false,
        error:   null,
        powerSweep: action.tab === 'power' ? action.sweep : state.powerSweep,
        shearSweep: action.tab === 'shear' ? action.sweep : state.shearSweep,
      };
    case 'SET_AUTO_MODE':
      return { ...state, autoMode: { ...state.autoMode, [action.tab]: action.on } };
    case 'SET_SWEEP_OPTIONS':
      return { ...state, sweepOptions: { ...state.sweepOptions, ...action.options } };
    case 'SET_VALIDATION': return { ...state, validationErrors: action.errors };
    case 'SET_TARGETS':    return { ...state, targetSafetyFactors: { ...state.targetSafetyFactors, ...action.targets } };
    case 'RESET':          return { ...defaultState, tablesLoaded: state.tablesLoaded };
    default:               return state;
  }
}

interface CalculatorContextType {
  state:        CalculatorState;
  setActiveTab: (tab: ActiveTab) => void;
  setUnitSystem:(system: 'SI' | 'imperial') => void;
  updateInputs: (inputs: any) => void;
  setTargets:   (targets: Partial<TargetSafetyFactors>) => void;
  setAutoMode:  (tab: 'power' | 'shear', on: boolean) => void;
  setSweepOptions: (options: Partial<CalculatorState['sweepOptions']>) => void;
  calculate:    () => void;
  reset:        () => void;
}

export const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const CalculatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    Promise.all([loadThreadTables(), loadMaterialTables()])
      .then(() => {
        dispatch({ type: 'TABLES_LOADED' });
        const iso = getAllISOClasses();
        const g88 = iso.find(m => m.grade === '8.8') ?? iso[0];
        if (g88) dispatch({ type: 'UPDATE_TENSION', inputs: { grade: g88 } });
      })
      .catch(err => console.error('Error loading tables:', err));
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/calculations.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current.onmessage = (e) => {
      if (e.data.success) {
        if (e.data.kind === 'sweep') {
          dispatch({ type: 'SET_SWEEP', tab: e.data.tab, sweep: e.data.results });
        } else {
          dispatch({ type: 'SET_RESULTS', tab: e.data.tab, results: e.data.results });
        }
      } else {
        dispatch({ type: 'SET_ERROR', error: e.data.error });
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  const setActiveTab  = (tab: ActiveTab) => dispatch({ type: 'SET_TAB', tab });
  const setUnitSystem = (system: 'SI' | 'imperial') => dispatch({ type: 'SET_UNIT', system });

  const updateInputs = (inputs: any) => {
    if (state.activeTab === 'power')   dispatch({ type: 'UPDATE_POWER',   inputs });
    if (state.activeTab === 'tension') dispatch({ type: 'UPDATE_TENSION', inputs });
    if (state.activeTab === 'shear')   dispatch({ type: 'UPDATE_SHEAR',   inputs });
  };

  const calculate = () => {
    if (!workerRef.current) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR',   error: null });

    const tab = state.activeTab;
    const w = workerRef.current;

    if (tab === 'power') {
      if (state.autoMode.power) {
        // Barrido cuerda × material — usa la tabla Acme estándar y los materiales del tornillo.
        const { majorDiameter, pitch, material, ...base } = state.powerInputs as any;
        const materials = POWER_SCREW_MATERIALS.filter(m => m.name !== 'Personalizado' && m.Sy > 0);
        w.postMessage({
          type: 'POWER_SCREW_SWEEP',
          payload: {
            base,
            threads:        getAllThreads('acme'),
            materials,
            targetN:        state.targetSafetyFactors.nYield,
            threadStandard: 'acme',
          },
          tab,
        });
      } else {
        w.postMessage({ type: 'POWER_SCREW_CALCULATE', payload: state.powerInputs, tab });
      }
    } else if (tab === 'tension') {
      w.postMessage({ type: 'TENSION_JOINT_CALCULATE', payload: state.tensionInputs, tab });
    } else if (tab === 'shear') {
      if (state.autoMode.shear) {
        // Barrido perno × grado — estándar y modo de área configurables.
        const std = state.sweepOptions.shearStandard;
        const { boltDiameter, shearArea, boltSp, boltSy, boltSut, ...base } = state.shearInputs as any;
        const grades = std === 'unc' ? getAllSAEGrades() : getAllISOClasses();
        w.postMessage({
          type: 'SHEAR_JOINT_SWEEP',
          payload: {
            base,
            threads:        getAllThreads(std),
            grades,
            targetN:        state.targetSafetyFactors.nShear,
            areaMode:       state.sweepOptions.shearAreaMode,
            threadStandard: std,
          },
          tab,
        });
      } else {
        w.postMessage({ type: 'SHEAR_JOINT_CALCULATE', payload: state.shearInputs, tab });
      }
    }
  };

  const setTargets = (targets: Partial<TargetSafetyFactors>) => dispatch({ type: 'SET_TARGETS', targets });
  const setAutoMode = (tab: 'power' | 'shear', on: boolean) => dispatch({ type: 'SET_AUTO_MODE', tab, on });
  const setSweepOptions = (options: Partial<CalculatorState['sweepOptions']>) =>
    dispatch({ type: 'SET_SWEEP_OPTIONS', options });
  const reset = () => dispatch({ type: 'RESET' });

  return (
    <CalculatorContext.Provider value={{ state, setActiveTab, setUnitSystem, updateInputs, setTargets, setAutoMode, setSweepOptions, calculate, reset }}>
      {children}
    </CalculatorContext.Provider>
  );
};

export function useCalculator(): CalculatorContextType {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error('useCalculator must be used within CalculatorProvider');
  return ctx;
}
