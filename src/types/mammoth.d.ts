declare module "mammoth" {
  interface Message {
    type: "warning" | "error";
    message: string;
  }

  interface Result {
    value: string;
    messages: Message[];
  }

  function extractRawText(options: { path: string } | { buffer: Buffer }): Promise<Result>;
  function convertToHtml(options: { path: string } | { buffer: Buffer }): Promise<Result>;
}
