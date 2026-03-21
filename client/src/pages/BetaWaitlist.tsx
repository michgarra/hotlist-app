import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import flameLogo from "@/assets/flame-logo.png";

interface Props {
  email?: string | null;
  onLogout: () => void;
}

export default function BetaWaitlist({ email, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <img src={flameLogo} alt="Hotlist" className="w-16 h-16 object-contain mx-auto" />

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">You're on the list</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hotlist is currently in private beta. You're signed in
            {email ? ` as ${email}` : ""}, but your account hasn't been added to the beta yet.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The team will let you know as soon as access is available.
          </p>
        </div>

        <div className="bg-muted rounded-xl p-4 text-left space-y-1">
          <p className="text-xs font-semibold text-foreground">What to expect</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Track movies and TV shows your friends recommend</li>
            <li>Rate what you've watched with flame ratings</li>
            <li>Share titles instantly via WhatsApp</li>
          </ul>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          data-testid="button-logout-waitlist"
          className="w-full"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
