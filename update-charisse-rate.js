// Run this script in the browser console to update Charisse's rate to 50
// This will preserve all other employee data

const updateCharisseRate = () => {
    try {
        // Get employees from localStorage
        const employeesData = localStorage.getItem('employees');

        if (!employeesData) {
            console.error('No employee data found in localStorage');
            return;
        }

        const employees = JSON.parse(employeesData);

        // Find Charisse and update her rate
        const updated = employees.map(emp => {
            if (emp.name.toLowerCase() === 'charisse') {
                console.log(`Updating ${emp.name}'s rate from ${emp.rate} to 50`);
                return { ...emp, rate: 50 };
            }
            return emp;
        });

        // Save back to localStorage
        localStorage.setItem('employees', JSON.stringify(updated));

        console.log('✅ Charisse\'s rate updated to 50 successfully!');
        console.log('Please refresh the page to see the changes.');

        return true;
    } catch (error) {
        console.error('Error updating rate:', error);
        return false;
    }
};

// Run the update
updateCharisseRate();
