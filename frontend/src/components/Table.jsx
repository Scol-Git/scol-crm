import React from 'react';
import { colors } from '../theme';

const Table = ({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
}) => {
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  };

  const headerCellStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    color: colors.textSecondary,
    borderBottom: `2px solid ${colors.borderLight}`,
    backgroundColor: colors.appBg,
    whiteSpace: 'nowrap',
  };

  const cellStyle = {
    padding: '14px 16px',
    borderBottom: `1px solid ${colors.borderLight}`,
    color: colors.textPrimary,
  };

  const rowStyle = {
    cursor: onRowClick ? 'pointer' : 'default',
    transition: 'background-color 0.15s ease',
  };

  const emptyStyle = {
    textAlign: 'center',
    padding: '40px',
    color: colors.textSecondary,
  };

  const loadingStyle = {
    textAlign: 'center',
    padding: '40px',
    color: colors.textSecondary,
  };

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div className="loading-spinner" />
        Loading...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div style={emptyStyle}>{emptyMessage}</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                style={{ ...headerCellStyle, ...column.headerStyle }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              style={rowStyle}
              onClick={() => onRowClick && onRowClick(row)}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = colors.appBg;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key || colIndex}
                  style={{ ...cellStyle, ...column.cellStyle }}
                >
                  {column.render
                    ? column.render(row[column.dataIndex], row, rowIndex)
                    : row[column.dataIndex]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
