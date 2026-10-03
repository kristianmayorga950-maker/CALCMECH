import { TensionJointCalculator } from '@/modules/tensionJoint/calculations';
import { ShearJointCalculator }   from '@/modules/shearJoint/calculations';
import { sweepShearJoint }        from '@/modules/shearJoint/design';

type MessageType =
  | 'TENSION_JOINT_CALCULATE'
  | 'SHEAR_JOINT_CALCULATE'
  | 'SHEAR_JOINT_SWEEP';

self.onmessage = (event: MessageEvent<{ type: MessageType; payload: any; tab: string }>) => {
  const { type, payload, tab } = event.data;
  try {
    let results: any;
    let kind: 'single' | 'sweep' = 'single';
    switch (type) {
      case 'TENSION_JOINT_CALCULATE':
        results = new TensionJointCalculator(payload).calculate();
        break;
      case 'SHEAR_JOINT_CALCULATE':
        results = new ShearJointCalculator(payload).calculate();
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
