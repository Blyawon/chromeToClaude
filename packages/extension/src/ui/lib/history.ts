export interface StyleEdit {
  prop: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

export class EditHistory {
  private past: StyleEdit[] = [];
  private future: StyleEdit[] = [];

  push(edit: StyleEdit): void {
    // Collapse rapid-fire edits on the same prop within 300ms
    const last = this.past[this.past.length - 1];
    if (
      last &&
      last.prop === edit.prop &&
      edit.timestamp - last.timestamp < 300
    ) {
      this.past[this.past.length - 1] = { ...last, newValue: edit.newValue, timestamp: edit.timestamp };
    } else {
      this.past.push(edit);
    }
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): StyleEdit | null {
    const top = this.past.pop();
    if (!top) return null;
    this.future.push(top);
    return top;
  }

  redo(): StyleEdit | null {
    const top = this.future.pop();
    if (!top) return null;
    this.past.push(top);
    return top;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
