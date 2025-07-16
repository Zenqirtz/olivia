const StatCard = ({ title, value, subtitle, icon, color }) => {
  const getColorClasses = (color) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-500'
        };
      case 'green':
        return {
          bg: 'bg-green-100',
          text: 'text-green-500'
        };
      case 'red':
        return {
          bg: 'bg-red-100',
          text: 'text-red-500'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-500'
        };
    }
  };

  const colorClasses = getColorClasses(color);
  const isNegative = subtitle?.includes('-');
  const subtitleColor = isNegative ? 'text-red-500' : 'text-green-500';

  return (
    <div className="stat-card">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 mb-1">{title}</p>
          <h2 className="text-3xl font-bold">{value}</h2>
          <p className={subtitleColor}>{subtitle}</p>
        </div>
        <div className={`p-2 rounded-full ${colorClasses.bg} ${colorClasses.text}`}>
          <i className={`fas ${icon}`}></i>
        </div>
      </div>
    </div>
  );
};

export default StatCard; 