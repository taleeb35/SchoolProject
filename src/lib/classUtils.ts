// Utility function to sort classes in custom order
export const sortClasses = <T extends { name: string }>(classes: T[]): T[] => {
  const classOrder = ['PG', 'Nursery', 'Prep', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  
  return [...classes].sort((a, b) => {
    const aIndex = classOrder.findIndex(order => 
      a.name.toLowerCase().includes(order.toLowerCase())
    );
    const bIndex = classOrder.findIndex(order => 
      b.name.toLowerCase().includes(order.toLowerCase())
    );
    
    // If both are in the order list, sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in the order list, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // Otherwise, sort alphabetically
    return a.name.localeCompare(b.name);
  });
};
