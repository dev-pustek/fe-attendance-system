export const stringToPastelColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL:
  // Exclude Red (approx 340-360 and 0-20)
  // Range available: 20 to 340 (320 degrees)
  // Map hash % 320 to 20..340
  const h = Math.abs(hash) % 320 + 20;
  
  // Further tweak: If it falls in "hot pink" or "orange-red" territory, shift it.
  // Ideally, cool colors (blue, teal, green, purple) look best for "calm" UI.
  // Let's favor cool colors?
  // Or just strict exclusion of red:
  
  // Saturation: 60-70% (Softer)
  // Lightness: 94-96% (Very light, barely tinted white)
  return `hsl(${h}, 70%, 96%)`; 
};

export const stringToDarkerColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const h = Math.abs(hash) % 320 + 20;

  // For text/borders, we want the same hue but darker
  // Saturation: 60%
  // Lightness: 40% (Dark enough for text)
  return `hsl(${h}, 60%, 40%)`; 
};
