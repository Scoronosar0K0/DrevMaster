import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "DrevMaster API",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Service unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
