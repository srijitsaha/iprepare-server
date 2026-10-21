export function fillLastSevenDays(originalData) {
  // 1. Convert the array into a dictionary/map for O(1) lookups
  const dataByDate = originalData.reduce((acc, item) => {
    acc[item.date] = item;
    return acc;
  }, {});

  const result = [];
  const today = new Date(); // Grabs today's local date

  // 2. Loop to generate the past 7 days in chronological order (oldest to newest)
  // Change `i = 6; i >= 0; i--` to `i = 0; i < 7; i++` if you want newest to oldest
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i); // Automatically handles month/year roll-overs

    // 3. Format the date back to 'YYYY-MM-DD'
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // 4. Push existing data if found, otherwise push default 0 values
    result.push(
      dataByDate[dateString] || {
        totalScore: 0,
        totalNumberOfQuestions: 0,
        date: dateString
      }
    );
  }

  return result;
}