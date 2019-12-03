import { gql } from 'apollo-boost';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { ApolloClient, OperationVariables, QueryOptions } from "apollo-client";
import { setContext } from 'apollo-link-context';
import { createHttpLink } from "apollo-link-http";
import { ToastsContainer } from "../../containers";
// import * as introspectionQueryResultData from 'src/fragmentTypes.json';
import { AuthResponse } from "./facebook";
import { IUser } from '../../interfaces';

interface IApiResponse {
  status: 'ok' | 'error';
}

interface IAuthApiResponse extends IApiResponse {
  token: string | null;
}

export type AuthApiRequest = AuthResponse;

export default class Api {
  private static instance: Api;

  private static getInstance(): Promise<Api> {
    return new Promise(complete => {
      if (!this.instance) {
        this.instance = new Api();
      }
      complete(this.instance);
    })
  }

  private client = new ApolloClient({
    cache: new InMemoryCache({fragmentMatcher: new IntrospectionFragmentMatcher({
      // introspectionQueryResultData
    })}),
    link: setContext((_, {headers}) => {
      const token = localStorage.getItem('Auth-Token');
      return {
        headers: {
          ...headers,
          Authorization: token ? `Bearer ${token}` : '',
        }
      }
    }).concat(createHttpLink({uri: '/api/graph'})),
  });

  public post(path: string, data?: any): Promise<IApiResponse> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('Auth-Token');

      fetch('/api/' + path, {
        method: 'POST',
        body: data ? JSON.stringify(data) : null,
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      }).then(response => {
        response.json().then(jsonData => {
          if (jsonData.status !== 'error') {
            resolve(jsonData);
          }
          else {
            reject(jsonData);
          }
        });
      }, error => reject(error)).catch(error => reject(error));
    });
  }

  public async query<T, TVariables = OperationVariables>(options: QueryOptions<TVariables>): Promise<T | null> {
    try {
      const {data, errors} = await this.client.query({
        ...options,
        fetchPolicy: 'network-only',
      });
      if (errors) {
        console.error(errors);
      }
      return data;
    } catch(error) {
      ToastsContainer.displaySystemError();
      throw error;
    }
  }

  public static async init({token}: {
    token?: string | null,
  }): Promise<void> {
    const instance = await this.getInstance();
    if (token !== undefined) {
      await instance.storeToken(token);
    }
  }

  public static signIn(params: AuthApiRequest): Promise<IAuthApiResponse> {
    return new Promise(async (complete, error) => {
      try {
        complete(await Api.instance.post('auth', params) as IAuthApiResponse);
      }
      catch (e) {
        complete({status: 'error', token: null});
      }
    });
  }

  public static async signOut() {
    localStorage.clear();
  }

  public static async fetchInitialAppData(): Promise<{
    user: IUser | null,
  }> {
    const data: any = await Api.instance.query({
      query: gql`{ user { id name } }`,
    });
    return data;
  }

  private async storeToken(token: string | null) {
    if (token) {
      localStorage.setItem('Auth-Token', token);
    } else {
      localStorage.removeItem('Auth-Token')
    }
  }
}