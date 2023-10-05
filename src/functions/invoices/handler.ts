import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { invoiceService } from '../../services';
import { formatJSONResponse } from '@libs/api-gateway';
import * as uuid from 'uuid'
import { middyfy } from "@libs/lambda";
import { Invoice, InvoiceFilter, InvoiceItems, SNSEvent } from "src/models";
import { exec } from "child_process";
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { readFile } from "fs/promises";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const asyncWriteFile = promisify(writeFile);
const asyncExec = promisify(exec);

export const createInvoice = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body ? event.body as unknown as Invoice : null

    const userId = event.requestContext.authorizer?.claims.sub

    if (!userId) {
      return formatJSONResponse({
        status: 401,
        message: 'Not authorized'
      })
    }

    const newInvoice: Invoice = {
      ...body,
      invoiceId: uuid.v1(),
      createdAt: new Date().toISOString(),
      createdBy: userId,
    }

    const invoice = await invoiceService.createInvoice(newInvoice)

    return formatJSONResponse({
      invoice
    })
  } catch (error) {
    console.log(error)
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

export const updateInvoice = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters.id

  const invoice: Partial<Invoice> = {
    ...event.body as unknown as Partial<Invoice>
  }

  const userId = event.requestContext.authorizer?.claims.sub

  if (!userId) {
    return formatJSONResponse({
      status: 401,
      message: 'Not authorized'
    })
  }

  try {
    const updatedInvoice = await invoiceService.updateInvoice({ id, userId, invoice })
    return formatJSONResponse({
      invoice: updatedInvoice
    })
  } catch (error) {
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

export const getAllInvoices = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext.authorizer?.claims.sub

  const filter: InvoiceFilter = {
    status: event.queryStringParameters?.status,
    clientId: event.queryStringParameters?.clientId
  }

  const invoices = await invoiceService.getAllInvoices({ userId, filter })

  return formatJSONResponse({
    invoices
  })
})

export const getInvoice = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext.authorizer?.claims.sub

  if (!userId) {
    return formatJSONResponse({
      status: 401,
      message: 'Not authorized'
    })
  }

  try {
    const invoice = await invoiceService.getInvoice(event.pathParameters.id, userId)

    // if invoice does not exist or does not belong to the user return 404
    if (!invoice) {
      return formatJSONResponse({
        status: 404,
        message: 'Invoice not found'
      })
    }

    return formatJSONResponse({
      invoice
    })
  } catch (error) {
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

export const deleteInvoice = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters.id

  const userId = event.requestContext.authorizer?.claims.sub

  if (!userId) {
    return formatJSONResponse({
      status: 401,
      message: 'Not authorized'
    })
  }

  try {
    // workaround to check if invoice exists and belongs to user before we delete it
    const invoice = await invoiceService.getInvoice(event.pathParameters.id, userId)

    // if invoice does not exist or does not belong to the user return 404
    if (!invoice) {
      return formatJSONResponse({
        status: 404,
        message: 'Invoice not found'
      })
    }

    await invoiceService.deleteInvoice({ id, userId })
    return formatJSONResponse({
      message: 'Invoice deleted'
    })
  }
  catch (error) {
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

export const snsMessageLogger = async (event: SNSEvent): Promise<void> => {
  console.log("SNS Message:", JSON.stringify(event.Records.map(record => record.Sns.Message), null, 2));
};

export const generateInvoicePdf = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const invoiceId = event.pathParameters?.id;
  const userId = event.requestContext.authorizer?.claims.sub;

  if (!userId) {
    return formatJSONResponse({
      status: 401,
      message: 'Not authorized'
    })
  }

  if (!invoiceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invoice ID is required' }),
    };
  }

  try {
    // Fetching invoice data
    const invoiceData = await invoiceService.getInvoice(invoiceId, userId);

    if (!invoiceData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Invoice not found' }),
      };
    }

    const items: InvoiceItems[] = [
      {
        description: 'Item 1',
        price: 10,
        quantity: 2,
      },
      {
        description: 'Item 2',
        price: 20,
        quantity: 1,
      },
    ];
    // Convert invoice data to HTML
    const html = await getInvoiceHtml({ ...invoiceData, items });

    // Convert HTML to PDF
    const pdf = await htmlToPdf(html, invoiceId);

    // Upload PDF to S3 and get the URL
    const url = await uploadToS3(pdf, `invoice-${invoiceId}.pdf`);

    return formatJSONResponse({
      status: 200,
      message: 'PDF generated successfully',
      url
    })
  } catch (error) {
    console.error(error);
    return formatJSONResponse({
      status: 500,
      message: 'Internal server error',
      error,
    })
  }
})

export async function getInvoiceHtml(invoice: Invoice): Promise<string> {
  try {
    const itemsHtml = invoice.items?.map(item => `
      <tr>
        <td>${item.description}</td>
        <td>${item.price.toFixed(2)}</td>
        <td>${item.quantity}</td>
        <td>${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const totalAmount = invoice.items?.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);

    const html = `
      <html>
      <head>
        <style>
          /* Add your CSS styles here */
        </style>
      </head>
      <body>
        <h1>Invoice ${invoice.invoiceId}</h1>
        <p>Date: ${invoice.dueDate}</p>
        <p>Customer: ${invoice.clientId}</p>
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

const htmlToPdf = async (html: string, invoiceId: string): Promise<Buffer> => {
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

const uploadToS3 = async (pdf: Buffer, filename: string): Promise<string> => {
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
