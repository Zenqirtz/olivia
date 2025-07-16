const Header = ({ title }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative">
          <i className="fas fa-bell text-gray-600"></i>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">1</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium">Admin</span>
          <i className="fas fa-chevron-down text-gray-600"></i>
        </div>
      </div>
    </div>
  );
};

export default Header; 