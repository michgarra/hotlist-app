import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cleanPersonName, personKey } from "@shared/people";

interface MergePreview {
  preferredName: string;
  aliases: string[];
  friendsCombined: number;
  titlesUpdated: number;
  examples: { title: string; before: string | null; after: string | null }[];
}

export function MergePeopleForm() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preferredName, setPreferredName] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [success, setSuccess] = useState("");
  const aliases = aliasInput.split(",").map(cleanPersonName).filter(Boolean);
  const valid = !!cleanPersonName(preferredName) && aliases.some(n => personKey(n) !== personKey(preferredName));
  const mutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await apiRequest("POST", "/api/people/merge", { preferredName, aliases, preview: dryRun });
      return { result: await res.json() as MergePreview, dryRun };
    },
    onSuccess: ({ result, dryRun }) => {
      if (dryRun) setPreview(result);
      else {
        setSuccess(`Names combined as ${result.preferredName}. Updated ${result.titlesUpdated} titles. Your titles and watch history were kept.`);
        setPreview(null);
        setPreferredName("");
        setAliasInput("");
        for (const key of ["/api/friends", "/api/recommendations", "/api/hotlist", "/api/community"]) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
    },
  });
  const resetReview = () => { setPreview(null); setSuccess(""); mutation.reset(); };
  return (
    <div className="mb-3 border rounded-md p-3 space-y-2 max-h-[45vh] overflow-y-auto shrink-0">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(!open)} data-testid="button-combine-people">
        Combine duplicate names
      </Button>
      {open && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Use this only for names belonging to the same person. Changes apply to your Friends and saved titles only. Titles, ratings and watch history are kept.</p>
          <label className="block text-sm">
            Name to keep
            <Input value={preferredName} disabled={mutation.isPending} maxLength={100}
              onChange={e => { setPreferredName(e.target.value); resetReview(); }}
              data-testid="input-person-preferred" />
          </label>
          <label className="block text-sm">
            Other names for this person, separated by commas
            <Input value={aliasInput} disabled={mutation.isPending}
              onChange={e => { setAliasInput(e.target.value); resetReview(); }}
              data-testid="input-person-aliases" />
          </label>
          <Button type="button" size="sm" variant="outline" disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate(true)} data-testid="button-preview-person-merge">
            Review changes
          </Button>
          {preview && (
            <div className="space-y-2 text-sm" data-testid="person-merge-preview">
              <p>Keep <strong>{preview.preferredName}</strong>; recognise {preview.aliases.join(", ")} as the same person.</p>
              <p>{preview.friendsCombined} existing friend entries matched. {preview.titlesUpdated} titles will have their people names cleaned up. Combined Watch With names will be separated.</p>
              {preview.examples.map((example, i) => (
                <p key={i} className="text-xs text-muted-foreground">{example.title}: {example.before || "—"} → {example.after || "—"}</p>
              ))}
              <Button type="button" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate(false)}
                data-testid="button-confirm-person-merge">
                {mutation.isPending ? "Combining…" : "Confirm combine names"}
              </Button>
            </div>
          )}
          {mutation.isError && <p role="alert" className="text-sm text-destructive">Couldn’t confirm the result. Review changes again before retrying. {mutation.error.message}</p>}
          {success && <p role="status" className="text-sm">{success}</p>}
        </div>
      )}
    </div>
  );
}
