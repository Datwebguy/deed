import StartWizard from "@/components/StartWizard";
import { NETWORK } from "@/lib/wallet";

export default function Start() {
  return <StartWizard network={NETWORK} />;
}
