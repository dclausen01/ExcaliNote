import React, { useState } from 'react';
import { Search } from 'lucide-react';

export const SearchPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="search-panel">
      {/* Search Input */}
      <div className="search-input-container">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Notizen durchsuchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Search Results */}
      <div className="search-results">
        {searchQuery ? (
          <div className="search-empty">
            <p className="text-sm text-gray-500">
              Suchfunktion wird in einer zukünftigen Version implementiert.
            </p>
          </div>
        ) : (
          <div className="search-empty">
            <p className="text-sm text-gray-500">
              Geben Sie einen Suchbegriff ein...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
