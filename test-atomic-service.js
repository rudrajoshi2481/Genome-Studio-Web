// Simple test to verify AtomicPipelineService imports correctly
const { AtomicPipelineService } = require('./components/EditorWindow/canvas/services/atomicPipelineService.ts');

console.log('AtomicPipelineService loaded successfully');
console.log('Available methods:', Object.getOwnPropertyNames(AtomicPipelineService));
