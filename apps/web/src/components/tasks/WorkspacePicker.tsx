// components/tasks/WorkspacePicker.tsx
"use client";

import { api } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkspacePickerProps {
  value: string;
  onChange: (workspaceId: string) => void;
}

export function WorkspacePicker({ value, onChange }: WorkspacePickerProps) {
  const { data: workspaces, isLoading } = api.workspaces.list.useQuery();

  // Find the selected workspace to display its name
  const selectedWorkspace = workspaces?.find((ws) => ws.id === value);

  console.log(
    "WorkspacePicker - value:",
    JSON.stringify(value),
    "selectedWorkspace:",
    selectedWorkspace?.name,
  );

  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className="w-full">
        {selectedWorkspace ? (
          <p className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: selectedWorkspace.color ?? "#8C6A64" }}
            />
            <p>{selectedWorkspace.name}</p>
          </p>
        ) : (
          <SelectValue
            placeholder={isLoading ? "Loading..." : "Select workspace"}
          />
        )}
      </SelectTrigger>
      <SelectContent>
        {workspaces?.map((ws) => (
          <SelectItem key={ws.id} value={ws.id}>
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: ws.color ?? "#8C6A64" }}
              />
              {ws.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
