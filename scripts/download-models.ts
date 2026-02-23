/**
 * Pre-download ONNX models used by @flowrag/provider-local.
 * Run before e2e tests to avoid flaky downloads during test execution.
 */
import { env, pipeline } from '@huggingface/transformers';

if (process.env.HF_HOME) env.cacheDir = process.env.HF_HOME;

const models: [string, string][] = [
  ['feature-extraction', 'Xenova/e5-small-v2'],
  ['text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2'],
];

for (const [task, model] of models) {
  console.log(`Downloading ${model}...`);
  const p = await pipeline(task, model, { dtype: 'q8', device: 'cpu' });
  await (p as { dispose?: () => Promise<void> }).dispose?.();
  console.log(`✅ ${model}`);
}
