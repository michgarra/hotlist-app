import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Check, X, UserPlus, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import flameLogo from "@/assets/flame-logo.png";

const AGE_RANGES = ["0-14", "15-20", "21-30", "31-40", "41-50", "51-60", "61-70+"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const STREAMING_APPS = [
  { name: "Netflix", color: "bg-red-600" },
  { name: "Apple TV+", color: "bg-gray-800" },
  { name: "Amazon Prime", color: "bg-blue-600" },
  { name: "Stan", color: "bg-blue-800" },
  { name: "Binge", color: "bg-purple-600" },
  { name: "HBO", color: "bg-violet-700" },
  { name: "Paramount+", color: "bg-blue-500" },
  { name: "Disney+", color: "bg-blue-700" },
  { name: "Britbox", color: "bg-red-700" },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [newFriend, setNewFriend] = useState("");
  const [friendError, setFriendError] = useState("");
  const [saving, setSaving] = useState(false);

  const canProceedStep1 = name.trim() && gender && ageRange;
  const canProceedStep2 = selectedApps.length > 0;

  const toggleApp = (app: string) => {
    setSelectedApps(prev =>
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    );
  };

  const addFriend = () => {
    const trimmed = newFriend.trim();
    if (!trimmed) return;
    if (friendsList.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      setFriendError("Already added!");
      return;
    }
    setFriendsList(prev => [...prev, trimmed]);
    setNewFriend("");
    setFriendError("");
  };

  const removeFriend = (friendName: string) => {
    setFriendsList(prev => prev.filter(f => f !== friendName));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiRequest("POST", "/api/profile", {
        name: name.trim(),
        gender,
        ageRange,
        streamingApps: selectedApps,
      });

      for (const friendName of friendsList) {
        try {
          await apiRequest("POST", "/api/friends", { name: friendName });
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      navigate("/");
    } catch {
      setSaving(false);
    }
  };

  const stepSubtitles = [
    "Tell us about yourself",
    "Your streaming apps",
    "Add your friends",
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6" data-testid="page-onboarding">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={flameLogo} alt="Hotlist" className="w-16 h-16 object-contain mb-3" data-testid="img-onboarding-logo" />
          <h1 className="text-white text-2xl font-bold tracking-tight">HOTLIST</h1>
          <p className="text-white/50 text-sm mt-1">{stepSubtitles[step - 1]}</p>
        </div>

        <div className="flex gap-2 mb-6 justify-center">
          <div className={`h-1 w-12 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-white/20"}`} />
          <div className={`h-1 w-12 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-white/20"}`} />
          <div className={`h-1 w-12 rounded-full transition-colors ${step >= 3 ? "bg-primary" : "bg-white/20"}`} />
        </div>

        {step === 1 && (
          <div className="space-y-5" data-testid="onboarding-step-1">
            <div>
              <label className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2 block">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                data-testid="input-name"
              />
            </div>

            <div>
              <label className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2 block">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                      gender === g
                        ? "bg-primary text-white border-primary"
                        : "bg-white/5 text-white/70 border-white/15 hover-elevate"
                    }`}
                    data-testid={`button-gender-${g.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2 block">Age Range</label>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map(range => (
                  <button
                    key={range}
                    onClick={() => setAgeRange(range)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                      ageRange === range
                        ? "bg-primary text-white border-primary"
                        : "bg-white/5 text-white/70 border-white/15 hover-elevate"
                    }`}
                    data-testid={`button-age-${range}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full mt-4"
              size="lg"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              data-testid="button-next"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5" data-testid="onboarding-step-2">
            <div>
              <label className="text-white/70 text-xs font-medium uppercase tracking-wider mb-3 block">
                Which streaming apps do you have?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STREAMING_APPS.map(app => {
                  const isSelected = selectedApps.includes(app.name);
                  return (
                    <button
                      key={app.name}
                      onClick={() => toggleApp(app.name)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-lg text-xs font-semibold transition-all border-2 ${
                        isSelected
                          ? `${app.color} text-white border-white/40 scale-[1.02]`
                          : "bg-white/5 text-white/60 border-white/10 hover-elevate"
                      }`}
                      data-testid={`button-app-${app.name.toLowerCase().replace(/[+\s]/g, "-")}`}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <span className="text-center leading-tight">{app.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1 border-white/20 text-white"
                onClick={() => setStep(1)}
                data-testid="button-back"
              >
                Back
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={!canProceedStep2}
                onClick={() => setStep(3)}
                data-testid="button-next-step2"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5" data-testid="onboarding-step-3">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <p className="text-white/60 text-xs">
                  Share recommendations with friends via WhatsApp
                </p>
              </div>

              <label className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2 block">
                Add friends who give you recommendations
              </label>
              <div className="flex gap-2">
                <Input
                  value={newFriend}
                  onChange={(e) => { setNewFriend(e.target.value); setFriendError(""); }}
                  placeholder="Friend's name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  onKeyDown={(e) => e.key === "Enter" && addFriend()}
                  data-testid="input-friend-name"
                />
                <Button
                  size="icon"
                  onClick={addFriend}
                  disabled={!newFriend.trim()}
                  data-testid="button-add-friend"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
              {friendError && <p className="text-red-400 text-xs mt-1">{friendError}</p>}
            </div>

            {friendsList.length > 0 && (
              <div className="space-y-1.5" data-testid="list-friends">
                {friendsList.map(f => (
                  <div key={f} className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2">
                    <span className="text-white text-sm font-medium">{f}</span>
                    <button
                      onClick={() => removeFriend(f)}
                      className="text-white/40 hover:text-white/80 transition-colors"
                      data-testid={`button-remove-friend-${f.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {friendsList.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">
                Add friends to track who recommended what
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1 border-white/20 text-white"
                onClick={() => setStep(2)}
                data-testid="button-back-step3"
              >
                Back
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={saving}
                onClick={handleFinish}
                data-testid="button-finish"
              >
                {saving ? "Saving..." : "Get Started"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
