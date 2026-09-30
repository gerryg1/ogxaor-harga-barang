'use client';

export default function SearchBar({ value, onChange, onSearch }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  return (
    <div className="search-wrapper">
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Please Input Item in Here"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button 
          type="button" 
          className="search-btn"
          onClick={() => onSearch && onSearch()}
        >
          Search Button
        </button>
      </div>
    </div>
  );
}
