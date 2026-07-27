export const handler = async (event) => {
  const ec2BaseUrl = "http://EC2privateIP:8080";

  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = event.rawPath || event.path || "/";
  const queryString = event.rawQueryString ? `?${event.rawQueryString}` : "";

  const hasBody = ["POST", "PUT", "PATCH"].includes(method);
  const body = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : event.body;

  const response = await fetch(`${ec2BaseUrl}${path}${queryString}`, {
    method,
    headers: {
      "Content-Type": event.headers?.["content-type"] || "application/json",
    },
    body: hasBody ? body : undefined,
  });

  const responseBody = await response.text();

  return {
    statusCode: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
    body: responseBody,
  };
};
