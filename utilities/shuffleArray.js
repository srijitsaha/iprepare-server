export function shuffleArray(array) {
    // Loop backwards from the last element down to the second element
    for (let i = array.length - 1; i > 0; i--) {
      // Pick a random index from 0 to i
      const j = Math.floor(Math.random() * (i + 1));
      
      // Swap elements array[i] and array[j] using ES6 destructuring
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}