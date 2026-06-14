import { Intent } from "./intents";
import { TaskType } from "./taskTypes";

export type BackendAction = `${Intent}_${TaskType}`;

export function resolveBackendAction(intent: Intent, taskType: TaskType): BackendAction {
  return `${intent}_${taskType}`;
}
