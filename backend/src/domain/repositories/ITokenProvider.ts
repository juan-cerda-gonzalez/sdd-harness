export interface ITokenProvider {
  getAccessToken(): Promise<string>;
}
