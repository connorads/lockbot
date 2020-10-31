import auth from "basic-auth";
import express, { Request, Response, NextFunction } from "express";
import { isLeft } from "fp-ts/lib/Either";
import * as D from "io-ts/lib/Decoder";
import { tokenAuthorizer } from "./infra";
import { ExpressError, Lock, NonEmptyWhitespaceFreeString } from "./types";

export const parseAllContentAsJson = express.json({
  type: "*/*",
});

export const handleErrors = (
  err: ExpressError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const { statusCode, message } = err;
  if (statusCode === 400) {
    console.log("Client error", { message });
    res.status(statusCode).json({
      error: message,
    });
  } else {
    console.error("Unhandled error", { statusCode, message, stack: err.stack });
    res.status(500).send({ error: "Internal server error" });
  }
};

export const authorizer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { channel, team } = req.params;
  const user = auth(req);
  if (!user) {
    console.log("Missing basic auth", { channel, team });
    res.status(401).json({ error: "Missing basic auth" });
  } else if (
    await tokenAuthorizer.isAuthorized(user.pass, user.name, channel, team)
  ) {
    console.log("Authorized", { team, channel, username: user.name });
    next();
  } else {
    console.log("Unauthorized", { team, channel, username: user.name });
    res.status(401).json({ error: "Unauthorized" });
  }
};

export const bodyValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const decoded = Lock.decode(req.body);
  if (isLeft(decoded)) {
    const error = D.draw(decoded.left);
    console.log("Invalid request body", { body: req.body, error });
    res.status(400).json({ error });
  } else {
    next();
  }
};

export const paramsValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const Params = D.type({
    lock: NonEmptyWhitespaceFreeString,
  });
  const decoded = Params.decode(req.params);
  if (isLeft(decoded)) {
    const error = D.draw(decoded.left);
    console.log("Invalid request params", { params: req.params, error });
    res.status(400).json({ error });
  } else {
    next();
  }
};
