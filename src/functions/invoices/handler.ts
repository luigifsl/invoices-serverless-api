import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { invoiceService, clientService } from '../../services';
import { formatJSONResponse } from '@libs/api-gateway';
import * as uuid from 'uuid'
import { middyfy } from "@libs/lambda";
import { Client, Invoice, InvoiceFilter, InvoiceWithClientInfo, SNSEvent } from "src/models";
import { getInvoiceHtml, htmlToPdf, uploadToS3 } from "@libs/pdf";

const getInvoiceClient = async (clientId: string): Promise<Client> => {
  const client = await clientService.getClient(clientId)

  if (!client) {
    throw new Error('Client not found')
  }

  return client
}

export const createInvoice = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body ? event.body as unknown as Invoice : null

    const userId = event.requestContext.authorizer?.claims.sub

    // we call this function to check if client exists before we create the invoice
    // if client does not exist it will throw an error and we won't create the invoice
    const client = await getInvoiceClient(body.clientId)

    const newInvoice: Invoice = {
      ...body,
      invoiceId: uuid.v1(),
      createdAt: new Date().toISOString(),
      createdBy: userId,
    }

    const invoice = await invoiceService.createInvoice(newInvoice)
    const invoiceWithClient: InvoiceWithClientInfo = {
      ...invoice,
      client
    }

    return formatJSONResponse({
      invoice: invoiceWithClient
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

  try {
    // we call this function to check if client exists before we create the invoice
    // if client does not exist it will throw an error and we won't create the invoice
    const client = await getInvoiceClient(invoice.clientId)

    const updatedInvoice = await invoiceService.updateInvoice({ id, userId, invoice })

    const invoiceWithClient: InvoiceWithClientInfo = {
      ...updatedInvoice,
      client
    }

    return formatJSONResponse({
      invoice: invoiceWithClient
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

  try {

    const invoice = await invoiceService.getInvoice(event.pathParameters.id, userId)


    // if invoice does not exist or does not belong to the user return 404
    if (!invoice) {
      return formatJSONResponse({
        status: 404,
        message: 'Invoice not found'
      })
    }

    // we assume the client exists because we already checked it when we created the invoice
    // if client does not exist it will throw an error anyway
    const client = await getInvoiceClient(invoice.clientId)

    const response: InvoiceWithClientInfo = {
      ...invoice,
      client
    }

    return formatJSONResponse({
      invoice: response
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

  if (!invoiceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invoice ID is required' }),
    };
  }

  try {
    const invoiceData = await invoiceService.getInvoice(invoiceId, userId);

    if (!invoiceData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Invoice not found' }),
      };
    }

    const client = await getInvoiceClient(invoiceData.clientId);

    const invoiceWithClient: InvoiceWithClientInfo = {
      ...invoiceData,
      client,
    };

    // convert invoice data to HTML
    const html = await getInvoiceHtml(invoiceWithClient);

    // convert HTML to PDF
    const pdf = await htmlToPdf(html, invoiceId);

    // upload PDF to S3 and get the URL
    const url = await uploadToS3(pdf, `invoice-${invoiceId}.pdf`);

    return formatJSONResponse({
      status: 200,
      message: 'Invoice PDF generated successfully',
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

