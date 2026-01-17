
export const formatDuration = (minutes: number): string => {
  if (!minutes) return "0 min";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 
      ? `${hours} Hour${hours !== 1 ? 's' : ''} ${mins} Minute${mins !== 1 ? 's' : ''}`
      : `${hours} Hour${hours !== 1 ? 's' : ''}`;
  }
  return `${mins} Minute${mins !== 1 ? 's' : ''}`;
};
