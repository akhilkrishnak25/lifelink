const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Export data to CSV
 */
exports.exportToCSV = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
  return buffer;
};

/**
 * Export data to Excel
 */
exports.exportToExcel = (data, filename, sheetName = 'Data') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
};

/**
 * Generate PDF report
 */
exports.generatePDFReport = async (data, title) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Header
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Content
    doc.fontSize(14).text('Report Summary', { underline: true });
    doc.moveDown();
    
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        doc.fontSize(10).text(`${index + 1}. ${JSON.stringify(item)}`, { width: 500 });
        doc.moveDown(0.5);
      });
    } else {
      Object.entries(data).forEach(([key, value]) => {
        doc.fontSize(10).text(`${key}: ${value}`, { width: 500 });
        doc.moveDown(0.5);
      });
    }
    
    doc.end();
  });
};

/**
 * Export donation history
 */
exports.exportDonationHistory = async (userId, format = 'csv') => {
  const DonationHistory = require('../models/DonationHistory');
  
  const donations = await DonationHistory.find({ donorId: userId })
    .populate('requestId')
    .populate('receiverId', 'name')
    .lean();
  
  const formattedData = donations.map(d => ({
    Date: new Date(d.donatedAt).toLocaleDateString(),
    'Blood Group': d.bloodGroup,
    Receiver: d.receiverId?.name || 'N/A',
    Location: d.location || 'N/A',
    Status: d.status
  }));
  
  if (format === 'csv') {
    return this.exportToCSV(formattedData, 'donation-history.csv');
  } else if (format === 'excel') {
    return this.exportToExcel(formattedData, 'donation-history.xlsx');
  } else if (format === 'pdf') {
    return this.generatePDFReport(formattedData, 'Donation History Report');
  }
};
