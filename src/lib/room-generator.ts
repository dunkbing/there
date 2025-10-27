import { randomText } from "./utils";

const ADJECTIVES = [
  "swift",
  "brave",
  "cosmic",
  "mystic",
  "golden",
  "silver",
  "electric",
  "stellar",
  "quantum",
  "lunar",
  "solar",
  "arctic",
  "blazing",
  "thunder",
  "crystal",
  "diamond",
  "turbo",
  "mega",
  "ultra",
  "super",
  "hyper",
  "cyber",
  "neon",
  "plasma",
  "atomic",
  "dynamic",
  "epic",
  "legendary",
  "royal",
  "noble",
  "fierce",
  "mighty",
];

const ANIMALS = [
  "panda",
  "tiger",
  "dragon",
  "phoenix",
  "eagle",
  "wolf",
  "falcon",
  "lion",
  "shark",
  "dolphin",
  "orca",
  "panther",
  "jaguar",
  "cheetah",
  "leopard",
  "lynx",
  "bear",
  "fox",
  "hawk",
  "owl",
  "raven",
  "cobra",
  "viper",
  "python",
  "rhino",
  "buffalo",
  "bison",
  "moose",
  "elk",
  "stallion",
  "mustang",
  "pegasus",
];

/**
 * Generates a short, URL-friendly room ID (e.g., "abc123xy")
 */
export function generateRoomId(): string {
  return randomText(8);
}

/**
 * Generates a cool room name with animal theme (e.g., "Swift Panda's Lair")
 */
export function generateRoomName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];

  // Capitalize first letter
  const capitalizedAdjective =
    adjective.charAt(0).toUpperCase() + adjective.slice(1);
  const capitalizedAnimal = animal.charAt(0).toUpperCase() + animal.slice(1);

  const suffixes = [
    "'s Lair",
    "'s Den",
    "'s Sanctuary",
    "'s Haven",
    "'s Domain",
    "'s Realm",
    " Room",
  ];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${capitalizedAdjective} ${capitalizedAnimal}${suffix}`;
}
