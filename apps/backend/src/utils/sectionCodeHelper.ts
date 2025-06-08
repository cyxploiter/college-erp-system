
export const departmentToBranchAbbr: { [key: string]: string } = {
  'Computer Science': 'CS',
  'Mathematics': 'MA',
  'Physics': 'PY',
  'History': 'HI',
  // Add other department to branch abbreviations as needed
};

// Used by seed and sectionService
export const getSemesterAbbrFromDetails = (semesterName: string, semesterYear: number): string => {
  // Expects semesterName to be "Odd", "Even", etc. and semesterYear e.g. 2024
  // This is slightly different from seed.ts's original getSemesterAbbr which took full name like "Odd 2024"
  const termPart = semesterName.split(' ')[0]; // Get "Odd" from "Odd 2024" or just "Odd"
  const termChar = termPart.charAt(0).toUpperCase();
  const yearAbbr = semesterYear.toString().slice(-2);
  return `${termChar}${yearAbbr}`; // e.g., O24, E25
};
