
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { clientService } from '../../services';
import { formatJSONResponse } from '@libs/api-gateway';
import * as uuid from 'uuid'
import { middyfy } from "@libs/lambda";
import { Client, ClientFilter } from "../../models";

export const createClient = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body ? event.body as unknown as Client : null

    const newClient: Client = {
      ...body,
      clientId: uuid.v1(),
    }

    const client = await clientService.createClient(newClient)

    return formatJSONResponse({
      client
    })
  } catch (error) {
    console.log(error)
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

export const updateClient = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters.id

  const client: Partial<Client> = {
    ...event.body as unknown as Partial<Client>
  }

  try {
    const updatedClient = await clientService.updateClient({ id, client })
    return formatJSONResponse({
      client: updatedClient
    })
  } catch (error) {
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

export const getAllClients = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const filter: ClientFilter = {
    email: event.queryStringParameters?.email,
    name: event.queryStringParameters?.name
  }

  const clients = await clientService.getAllClients({ filter })

  return formatJSONResponse({
    clients
  })
})

export const getClient = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const client = await clientService.getClient(event.pathParameters.id)

    // if client does not exist return 404
    if (!client) {
      return formatJSONResponse({
        status: 404,
        message: 'Client not found'
      })
    }

    return formatJSONResponse({
      client
    })
  } catch (error) {
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

export const deleteClient = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters.id

  try {
    // workaround to check if client exists and belongs to user before we delete it
    const client = await clientService.getClient(event.pathParameters.id)

    // if client does not exist return 404
    if (!client) {
      return formatJSONResponse({
        status: 404,
        message: 'Client not found'
      })
    }

    await clientService.deleteClient(id)
    return formatJSONResponse({
      message: 'Client deleted'
    })
  }
  catch (error) {
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})
