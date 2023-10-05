import { exec } from "child_process";
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { readFile } from "fs/promises";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { InvoiceWithClientInfo, InvoiceItem } from "src/models";

const asyncWriteFile = promisify(writeFile);
const asyncExec = promisify(exec);

// simple html to convert to pdf
export async function getInvoiceHtml(invoice: InvoiceWithClientInfo): Promise<string> {
  try {
    const itemsHtml = invoice.items.map((item: InvoiceItem) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.price.toFixed(2)}</td>
        <td>${item.quantity}</td>
        <td>${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const totalAmount = invoice.items.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);

    const html = `
      <html>
      <body>
        <h1>Invoice ${invoice.invoiceId}</h1>
        <p>Date: ${invoice.dueDate}</p>
        <h3>Customer Info</h3>
        <p>Name: ${invoice.client.name}</p>
        <p>Email: ${invoice.client.email}</p>
        <p>Address: ${invoice.client.address}</p>
        <p>Phone number: ${invoice.client.phoneNumber}</p>
        <table border="1">
          <thead>
            <tr>
              <th>Description</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <p>Total Amount: $${totalAmount}</p>
      </body>
      </html>
    `;

    return html;
  } catch (error) {
    console.error("Error generating invoice HTML:", error);
    throw error;
  }
}

// use wkhtmltopdf to generate pdf from html from lambday layer
export const htmlToPdf = async (html: string, invoiceId: string): Promise<Buffer> => {
  const htmlFilePath = `/tmp/${invoiceId}.html`;
  const pdfFilePath = `/tmp/${invoiceId}.pdf`;

  await asyncWriteFile(htmlFilePath, html);

  try {
    await asyncExec(`/opt/bin/wkhtmltopdf ${htmlFilePath} ${pdfFilePath}`);
    console.log('PDF generated successfully');

    const pdfBuffer = await readFile(pdfFilePath);
    return pdfBuffer;

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// upload pdf to s3 and return signed url
// expiration is 1hr for the sake of this demo
export const uploadToS3 = async (pdf: Buffer, filename: string): Promise<string> => {
  const s3Client = new S3Client();
  const bucketName = process.env.INVOICES_BUCKET_NAME;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: pdf,
    ContentType: 'application/pdf',
  });

  await s3Client.send(command);

  const url = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: bucketName,
    Key: filename,
  }), { expiresIn: 3600 }); // expires in 1 hour

  return url;
};
