//function to generate hostnames
const generateRandomHostname = () => {
  return `server-${Math.random().toString(36).substring(2, 7)}`;
};

export default generateRandomHostname;
