import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import departmentsRouter from "./departments";
import channelsRouter from "./channels";
import contactsRouter from "./contacts";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import webhooksRouter from "./webhooks";
import statsRouter from "./stats";
import mediaRouter from "./media";
import whatsappBlastRouter from "./whatsapp-blasts";
import whatsappTemplatesRouter from "./whatsapp-templates";
import externalSendRouter from "./external-send";
import sendHelloRouter from "./send-hello";
import outboxRouter from "./outbox";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(channelsRouter);
router.use(contactsRouter);
router.use(conversationsRouter);
router.use(messagesRouter);
router.use(sendHelloRouter);
router.use(webhooksRouter);
router.use(statsRouter);
router.use(mediaRouter);
router.use(whatsappBlastRouter);
router.use(whatsappTemplatesRouter);
router.use(externalSendRouter);
router.use(outboxRouter);

export default router;
