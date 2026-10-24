import Image from "next/image";
const descriptions = {
  field: "Straw bales in a harvested wheat field under a cloudy sky",
  collection: "Workers loading collected straw bales onto farm machinery",
  harvest: "Aerial view of machinery harvesting rows of crops",
  storage: "Dry hay bales stacked together in a barn",
  soil: "Hands holding soil and seeds",
};
export function FieldPhoto({name, className = "", preload = false}: {name: keyof typeof descriptions; className?: string; preload?: boolean}) {
  return <div className={`field-photo ${className}`}><Image src={`/images/bioproof/${name}.jpg`} alt={descriptions[name]} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 60vw, 720px" preload={preload} style={{objectFit:"cover"}} /></div>;
}
