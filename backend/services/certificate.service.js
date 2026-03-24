const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Certificate Generation Service
 * Generates formal donation certificates for donors
 */

class CertificateService {
  constructor() {
    // Ensure certificates directory exists
    this.certificatesDir = path.join(__dirname, '../certificates');
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
  }

  /**
   * Generate donation certificate for a donor
   * @param {Object} donationData - Donation information
   * @returns {Promise<string>} - Path to generated certificate
   */
  async generateCertificate(donationData) {
    const {
      donorName,
      donorId,
      bloodGroup,
      unitsGiven,
      hospitalName,
      donationDate,
      certificateNumber,
      city
    } = donationData;

    const fileName = `certificate_${certificateNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.certificatesDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        // Pipe to file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add certificate content
        this._drawCertificate(doc, donationData);

        // Finalize PDF
        doc.end();

        // Wait for stream to finish
        stream.on('finish', () => {
          console.log(`✅ Certificate generated: ${fileName}`);
          resolve(filePath);
        });

        stream.on('error', (error) => {
          console.error('Certificate generation error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Certificate creation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Draw certificate content
   */
  _drawCertificate(doc, data) {
    const {
      donorName,
      bloodGroup,
      unitsGiven,
      hospitalName,
      donationDate,
      certificateNumber,
      city
    } = data;

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;

    const safeDonorName = String(donorName || 'Donor').trim().slice(0, 48);
    const safeHospitalName = String(hospitalName || 'Hospital').trim().slice(0, 70);
    const safeCity = String(city || '').trim().slice(0, 40);

    // Draw decorative border
    this._drawBorder(doc, pageWidth, pageHeight);

    // Draw header with LifeLink logo text
    doc.fontSize(40)
       .font('Helvetica-Bold')
       .fillColor('#C41E3A')
       .text('LIFELINK', centerX - 120, 60);

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#333333')
       .text('Blood Donor Network', centerX - 80, 110);

    // Draw blood drop icon (simple circle with gradient effect)
    doc.circle(centerX, 160, 25)
       .fillAndStroke('#C41E3A', '#8B0000');

    // Certificate Title
    doc.fontSize(36)
       .font('Helvetica-Bold')
       .fillColor('#2C3E50')
       .text('CERTIFICATE OF APPRECIATION', 50, 220, {
         width: pageWidth - 100,
         align: 'center'
       });

    // Subtitle line
    doc.moveTo(centerX - 200, 270)
       .lineTo(centerX + 200, 270)
       .strokeColor('#C41E3A')
       .lineWidth(2)
       .stroke();

    // Main content
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#555555')
       .text('This is to certify that', 50, 310, {
         width: pageWidth - 100,
         align: 'center'
       });

    // Donor name (highlighted)
    doc.fontSize(32)
       .font('Helvetica-Bold')
       .fillColor('#C41E3A')
       .text(safeDonorName.toUpperCase(), 50, 350, {
         width: pageWidth - 100,
         align: 'center',
         height: 42,
         ellipsis: true
       });

    // Donation details
    const donationText = `has generously donated ${unitsGiven} unit(s) of ${bloodGroup} blood at ${safeHospitalName}${safeCity ? `, ${safeCity}` : ''} on ${this._formatDate(donationDate)}. Your selfless act of kindness has the power to save lives and bring hope to those in need.`;

    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#333333')
       .text(donationText, 80, 410, {
         width: pageWidth - 160,
         align: 'center',
         lineGap: 4,
         height: 78,
         ellipsis: true
       });

    // Appreciation message
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2C3E50')
       .text('Thank you for being a life saver!', 50, 480, {
         width: pageWidth - 100,
         align: 'center'
       });

    // Footer section with signatures
    const footerY = pageHeight - 95;

    // Certificate number
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#888888')
       .text(`Certificate No: ${certificateNumber}`, 60, footerY);

    // Date of issue
    doc.text(`Date of Issue: ${this._formatDate(new Date())}`, pageWidth - 260, footerY);

    // Signature lines
    const signatureY = footerY + 20;

    // Left signature - Medical Director
    doc.moveTo(100, signatureY)
       .lineTo(250, signatureY)
       .strokeColor('#CCCCCC')
       .lineWidth(1)
       .stroke();

    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#333333')
       .text('Medical Director', 100, signatureY + 10, { width: 150, align: 'center' });

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#666666')
       .text('LifeLink Medical Team', 100, signatureY + 28, { width: 150, align: 'center' });

    // Right signature - Chief Executive
    doc.moveTo(pageWidth - 250, signatureY)
       .lineTo(pageWidth - 100, signatureY)
       .strokeColor('#CCCCCC')
       .lineWidth(1)
       .stroke();

    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#333333')
       .text('Chief Executive Officer', pageWidth - 250, signatureY + 10, { width: 150, align: 'center' });

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#666666')
       .text('LifeLink Foundation', pageWidth - 250, signatureY + 28, { width: 150, align: 'center' });

    // Bottom tagline
    doc.fontSize(11)
       .font('Helvetica-Oblique')
       .fillColor('#C41E3A')
       .text('"Every Drop Counts, Every Donor Matters"', 50, pageHeight - 30, {
         width: pageWidth - 100,
         align: 'center'
       });
  }

  /**
   * Draw decorative border
   */
  _drawBorder(doc, width, height) {
    const margin = 20;
    const borderWidth = 3;

    // Outer border
    doc.rect(margin, margin, width - (margin * 2), height - (margin * 2))
       .strokeColor('#C41E3A')
       .lineWidth(borderWidth)
       .stroke();

    // Inner border
    doc.rect(margin + 10, margin + 10, width - (margin * 2) - 20, height - (margin * 2) - 20)
       .strokeColor('#E8E8E8')
       .lineWidth(1)
       .stroke();

    // Corner decorations (small circles)
    const cornerSize = 5;
    const corners = [
      [margin + 15, margin + 15],
      [width - margin - 15, margin + 15],
      [margin + 15, height - margin - 15],
      [width - margin - 15, height - margin - 15]
    ];

    corners.forEach(([x, y]) => {
      doc.circle(x, y, cornerSize)
         .fillAndStroke('#C41E3A', '#8B0000');
    });
  }

  /**
   * Format date for display
   */
  _formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  }

  /**
   * Generate unique certificate number
   */
  generateCertificateNumber(donorId, donationDate) {
    const year = new Date(donationDate).getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const donorIdShort = donorId.toString().slice(-4);
    return `LL-${year}-${donorIdShort}-${timestamp}`;
  }

  /**
   * Delete certificate file
   */
  async deleteCertificate(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Certificate deleted: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting certificate:', error);
      return false;
    }
  }

  /**
   * Check if certificate exists
   */
  certificateExists(filePath) {
    return fs.existsSync(filePath);
  }
}

module.exports = new CertificateService();
