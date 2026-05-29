import { PowerScrewCalculator }   from '@/modules/powerScrew/calculations';
import { TensionJointCalculator } from '@/modules/tensionJoint/calculations';
import { ShearJointCalculator }   from '@/modules/shearJoint/calculations';
import { sweepPowerScrew }        from '@/modules/powerScrew/design';
import { sweepShearJoint }        from '@/modules/shearJoint/design';

type MessageType =
  | 'POWER_SCREW_CALCULATE'
  | 'TENSION_JOINT_CALCULATE'
  | 'SHEAR_JOINT_CALCULATE'
  | 'POWER_SCREW_SWEEP'
  | 'SHEAR_JOINT_SWEEP';

self.onmessage = (event: MessageEvent<{ type: MessageType; payload: any; tab: string }>) => {
  const { type, payload, tab } = event.data;
  try {
    let results: any;
    let kind: 'single' | 'sweep' = 'single';
    switch (type) {
      case 'POWER_SCREW_CALCULATE':
        results = new PowerScrewCalculator(payload).calculate();
        break;
      case 'TENSION_JOINT_CALCULATE':
        results = new TensionJointCalculator(payload).calculate();
        break;
      case 'SHEAR_JOINT_CALCULATE':
        results = new ShearJointCalculator(payload).calculate();
        break;
      case 'POWER_SCREW_SWEEP':
        results = sweepPowerScrew(
          payload.base, payload.threads, payload.materials,
          payload.targetN, payload.threadStandard,
        );
        kind = 'sweep';
        break;
      case 'SHEAR_JOINT_SWEEP':
        results = sweepShearJoint(
          payload.base, payload.threads, payload.grades,
          payload.targetN, payload.areaMode, payload.threadStandard,
        );
        kind = 'sweep';
        break;
      default:
        throw new Error(`Tipo desconocido: ${type}`);
    }
    self.postMessage({ success: true, results, tab, kind });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message, tab });
  }
};
