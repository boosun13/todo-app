"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  createTodoSchema,
  type CreateTodoFormValues,
  type CreateTodoInput,
} from "@/domain/todo";
import type { ActionResult } from "../_actions/result";

type Props = {
  defaultValues?: CreateTodoFormValues;
  submitLabel: string;
  /** 生のフォーム値を受け取る。最終的な検証はサーバー側(service)が行う */
  onSubmit: (values: CreateTodoFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

const EMPTY: CreateTodoFormValues = { title: "", description: "", priority: "MEDIUM", dueDate: "" };

/** 新規作成と編集で共有するフォーム。検証スキーマはサーバーと同じ domain のものを使う */
export function TodoForm({ defaultValues = EMPTY, submitLabel, onSubmit, onSuccess }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateTodoFormValues, unknown, CreateTodoInput>({
    resolver: zodResolver(createTodoSchema),
    defaultValues,
  });
  const { register, control, formState } = form;
  const { errors } = formState;

  const submit = form.handleSubmit(() =>
    startTransition(async () => {
      const result = await onSubmit(form.getValues());
      if (result.ok) return onSuccess?.();
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(name as keyof CreateTodoFormValues, { message });
      }
      if (!result.fieldErrors) form.setError("root", { message: result.error });
    }),
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="title">タイトル</Label>
        <Input id="title" autoFocus aria-invalid={!!errors.title} {...register("title")} />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">メモ</Label>
        <Textarea id="description" rows={3} aria-invalid={!!errors.description} {...register("description")} />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="priority">優先度</Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={PRIORITY_LABEL}
              >
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">期限</Label>
          <Input id="dueDate" type="date" aria-invalid={!!errors.dueDate} {...register("dueDate")} />
          <FieldError message={errors.dueDate?.message} />
        </div>
      </div>

      <FieldError message={errors.root?.message} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
