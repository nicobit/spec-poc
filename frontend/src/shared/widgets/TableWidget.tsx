import React from 'react';

const TableWidget: React.FC = () => (
  <table style={{ width: '100%', fontSize: 12 }}>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Alice</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Bob</td>
      </tr>
    </tbody>
  </table>
);

export default TableWidget;
