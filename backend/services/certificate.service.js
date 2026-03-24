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

    const normalize = (value, maxLen) => String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen);

    const safeDonorName = normalize(donorName || 'Donor', 48).toUpperCase();
    const safeHospitalName = normalize(hospitalName || 'Hospital', 72);
    const safeCity = normalize(city || '', 36);

    this._drawBorder(doc, pageWidth, pageHeight);

    doc.font('Helvetica-Bold').fontSize(38).fillColor('#C41E3A')
      .text('LIFELINK', 0, 58, { width: pageWidth, align: 'center', lineBreak: false });

    doc.font('Helvetica').fontSize(12).fillColor('#333333')
      .text('Blood Donor Network', 0, 104, { width: pageWidth, align: 'center', lineBreak: false });

    doc.circle(centerX, 150, 20).fillAndStroke('#C41E3A', '#8B0000');

    doc.font('Helvetica-Bold').fontSize(30).fillColor('#2C3E50')
      .text('CERTIFICATE OF APPRECIATION', 40, 192, { width: pageWidth - 80, align: 'center', lineBreak: false });

    doc.moveTo(centerX - 190, 235)
      .lineTo(centerX + 190, 235)
      .strokeColor('#C41E3A')
      .lineWidth(2)
      .stroke();

    doc.font('Helvetica').fontSize(15).fillColor('#555555')
      .text('This is to certify that', 40, 260, { width: pageWidth - 80, align: 'center', lineBreak: false });

    const donorNameText = this._truncateToWidth(doc, safeDonorName, pageWidth - 120, 'Helvetica-Bold', 28);
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#C41E3A')
      .text(donorNameText, 60, 288, { width: pageWidth - 120, align: 'center', lineBreak: false });

    const donationSentence = `has generously donated ${unitsGiven} unit(s) of ${bloodGroup} blood at ${safeHospitalName}${safeCity ? `, ${safeCity}` : ''} on ${this._formatDate(donationDate)}.`;
    const messageSentence = 'Your selfless act of kindness has the power to save lives and bring hope to those in need.';
    const wrappedMain = this._wrapLines(doc, `${donationSentence} ${messageSentence}`, pageWidth - 180, 4, 'Helvetica', 13);

    doc.font('Helvetica').fontSize(13).fillColor('#333333')
      .text(wrappedMain.join('\n'), 90, 340, {
        width: pageWidth - 180,
        align: 'center',
        lineGap: 4,
        lineBreak: true
      });

    doc.font('Helvetica-Bold').fontSize(15).fillColor('#2C3E50')
      .text('Thank you for being a life saver!', 40, 430, { width: pageWidth - 80, align: 'center', lineBreak: false });

    const footerY = pageHeight - 84;

    doc.font('Helvetica').fontSize(10).fillColor('#888888')
      .text(`Certificate No: ${certificateNumber}`, 60, footerY, { lineBreak: false });

    doc.text(`Date of Issue: ${this._formatDate(new Date())}`, pageWidth - 265, footerY, { lineBreak: false });

    const signatureY = pageHeight - 58;

    doc.moveTo(100, signatureY).lineTo(250, signatureY).strokeColor('#CCCCCC').lineWidth(1).stroke();
    doc.moveTo(pageWidth - 250, signatureY).lineTo(pageWidth - 100, signatureY).strokeColor('#CCCCCC').lineWidth(1).stroke();

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
      .text('Medical Director', 100, signatureY + 6, { width: 150, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor('#666666')
      .text('LifeLink Medical Team', 100, signatureY + 20, { width: 150, align: 'center', lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
      .text('Chief Executive Officer', pageWidth - 250, signatureY + 6, { width: 150, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor('#666666')
      .text('LifeLink Foundation', pageWidth - 250, signatureY + 20, { width: 150, align: 'center', lineBreak: false });

    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#C41E3A')
      .text('"Every Drop Counts, Every Donor Matters"', 40, pageHeight - 24, {
        width: pageWidth - 80,
        align: 'center',
        lineBreak: false
      });

  }

  _truncateToWidth(doc, text, width, font = 'Helvetica', fontSize = 12) {
    doc.font(font).fontSize(fontSize);
    if (doc.widthOfString(text) <= width) {
      return text;
    }

    let value = text;
    while (value.length > 1 && doc.widthOfString(`${value}...`) > width) {
      value = value.slice(0, -1);
    }
    return `${value}...`;
  }

  _wrapLines(doc, text, width, maxLines, font = 'Helvetica', fontSize = 12) {
    doc.font(font).fontSize(fontSize);
    const words = String(text || '').split(' ');
    const lines = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (doc.widthOfString(candidate) <= width) {
        current = candidate;
      } else {
        lines.push(current || word);
        current = current ? word : '';
        if (lines.length >= maxLines - 1) {
          break;
        }
      }
    }

    if (current && lines.length < maxLines) {
      lines.push(current);
    }

    if (lines.length === maxLines) {
      lines[maxLines - 1] = this._truncateToWidth(doc, lines[maxLines - 1], width, font, fontSize);
    }

    return lines;
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
