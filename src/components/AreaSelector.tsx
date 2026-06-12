import { motion, AnimatePresence } from "framer-motion";
import { Store, GraduationCap, UtensilsCrossed, Building2, Trees, Church, Bus, ShoppingBag, Home, Briefcase, School, Stethoscope } from "lucide-react";

export interface Area {
  id: string;
  label: string;
  icon: React.ElementType;
  emoji: string;
}

export const AREAS: Area[] = [
  { id: "public", label: "Espace public", icon: Building2, emoji: "🏙️" },
  { id: "neighborhood", label: "Quartier", icon: Home, emoji: "🏘️" },
  { id: "work", label: "Travail", icon: Briefcase, emoji: "💼" },
  { id: "university", label: "Université", icon: GraduationCap, emoji: "🎓" },
  { id: "highschool", label: "Lycée", icon: School, emoji: "🏫" },
  { id: "supermarket", label: "Supermarché", icon: ShoppingBag, emoji: "🛒" },
  { id: "shop", label: "Administration", icon: Landmark, emoji: "🏛️" },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed, emoji: "🍽️" },
  { id: "transport", label: "Transport", icon: Bus, emoji: "🚌" },
  { id: "hospital", label: "Hôpital", icon: Stethoscope, emoji: "🏥" },
  { id: "church", label: "Lieu de culte", icon: Church, emoji: "⛪" },
  { id: "park", label: "Parc / Jardin", icon: Trees, emoji: "🌳" },
];

export const AREA_NAMES: Record<string, string[]> = {
  public: ["Passant", "Flâneur", "Citadin", "Piéton", "Badaud", "Promeneur"],
  neighborhood: ["Voisin", "Riverain", "Habitant", "Résident", "Du quartier"],
  work: ["Collègue", "Employé", "Bosseur", "Pro", "Travailleur"],
  university: ["Étudiant", "Camarade", "Intellectuel", "Penseur", "Chercheur"],
  highschool: ["Lycéen", "Élève", "Camarade", "Bachelier", "Étudiant"],
  supermarket: ["Client mystère", "Acheteur", "Consommateur", "Visiteur rayon"],
  shop: ["Chineur", "Habitué", "Curieux", "Client discret"],
  restaurant: ["Gourmet", "Fin palais", "Convive", "Gastronome", "Affamé"],
  transport: ["Voyageur", "Passager", "Navetteur", "Nomade"],
  hospital: ["Visiteur", "Patient", "Accompagnant", "Soignant"],
  church: ["Fidèle", "Croyant", "Pèlerin", "Méditant"],
  park: ["Rêveur", "Marcheur", "Contemplatif", "Nature lover"],
};

export function getAreaName(areaId: string): string {
  const names = AREA_NAMES[areaId] || AREA_NAMES.public;
  const name = names[Math.floor(Math.random() * names.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${name} #${num}`;
}

export function getAreaById(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

interface Props {
  open: boolean;
  onSelect: (area: Area) => void;
  currentAreaId?: string;
}

export default function AreaSelector({ open, onSelect, currentAreaId }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 top-auto bottom-8 bg-card rounded-3xl z-50 p-5 shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">📍</div>
              <h2 className="text-lg font-extrabold text-foreground">Où es-tu ?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Choisis ton espace pour une identité anonyme adaptée
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {AREAS.map((area) => {
                const Icon = area.icon;
                const isActive = currentAreaId === area.id;
                return (
                  <motion.button
                    key={area.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelect(area)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-background text-foreground hover:bg-primary/10"
                    }`}
                  >
                    <span className="text-2xl">{area.emoji}</span>
                    <span className="text-[11px] font-bold leading-tight text-center">{area.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
