/** 新規作成ボタン(create-todo-dialog.tsx のトリガー)を指す属性 */
export const CREATE_TODO_ATTR = "data-create-todo";

export function findCreateTodoButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${CREATE_TODO_ATTR}]`);
}

/**
 * 行の削除後にフォーカスを移す。削除前に控えた候補の TODO id (次の行 → 前の行) を使い、
 * 再検証で DOM が更新され削除した行が消えるのを待ってから、候補のチェックボックス → 新規作成ボタンの順に focus する。
 * 行コンポーネント自体が消えるため、コンポーネントの状態に依存しないモジュール関数にしている。
 */
export function focusAfterRemove(removedId: string, candidateIds: string[]) {
  const started = performance.now();
  const step = () => {
    const removed = document.querySelector(`[data-todo-id="${CSS.escape(removedId)}"]`);
    // 再検証の反映待ち(最大 2 秒)。超えたら現在の DOM で移す
    if (removed && performance.now() - started < 2000) {
      requestAnimationFrame(step);
      return;
    }
    for (const id of candidateIds) {
      const checkbox = document.querySelector<HTMLElement>(`[data-todo-id="${CSS.escape(id)}"] [role="checkbox"]`);
      if (checkbox) {
        checkbox.focus();
        return;
      }
    }
    findCreateTodoButton()?.focus();
  };
  requestAnimationFrame(step);
}
