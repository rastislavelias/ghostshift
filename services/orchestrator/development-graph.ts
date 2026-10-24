import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { type Change, type Check } from '../../apps/console/lib/development-contract.ts';
const State = Annotation.Root({
  attempt: Annotation<number>, change: Annotation<Change | null>, checks: Annotation<Check[]>,
  passed: Annotation<boolean>, error: Annotation<string | null>, retryable: Annotation<boolean>,
});
export type DevelopmentState = typeof State.State;
export function developmentGraph(steps: {
  generate: (state: DevelopmentState) => Promise<Partial<DevelopmentState>>;
  check: (state: DevelopmentState) => Promise<Partial<DevelopmentState>>;
  maxAttempts: number;
}) {
  return new StateGraph(State)
    .addNode('developer', steps.generate)
    .addNode('validate', steps.check)
    .addEdge(START, 'developer')
    .addConditionalEdges('developer', state => state.change && !state.error ? 'validate' : state.retryable && state.attempt < steps.maxAttempts ? 'developer' : END)
    .addConditionalEdges('validate', state => state.passed || !state.retryable || state.attempt >= steps.maxAttempts ? END : 'developer')
    .compile();
}
