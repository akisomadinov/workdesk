import { useEffect, useState } from "react";
import {
    useTelegramLinkGetQuery,
    useTelegramLinkCreateMutation,
    useTelegramLinkConfirmMutation,
    useTelegramLinkCancelMutation,
    useTelegramLinkDeleteMutation,
    useNotificationsTelegramQuery,
    useNotificationsConfigureMutation
} from "@/api/autogen/workdesk";
import { message } from "@/common/models";

export default function useTelegramLink() {
    const [link, setLink] = useState<{ url: string; expires: string } | null>(null);
    const [error, setError] = useState("");
    const [waiting, setWaiting] = useState(false);
    const {
        data: state,
        isLoading,
        error: loadError
    } = useTelegramLinkGetQuery(undefined, {
        pollingInterval: waiting ? 3000 : 0,
        skipPollingIfUnfocused: true,
        refetchOnFocus: true
    });
    const { data: settings } = useNotificationsTelegramQuery();
    useEffect(() => {
        setWaiting(!!state?.pendingUntil);
    }, [state?.pendingUntil]);
    const [create, creating] = useTelegramLinkCreateMutation();
    const [confirm, confirming] = useTelegramLinkConfirmMutation();
    const [cancel, canceling] = useTelegramLinkCancelMutation();
    const [disconnect, disconnecting] = useTelegramLinkDeleteMutation();
    const [configure, configuring] = useNotificationsConfigureMutation();
    const busy =
        isLoading ||
        creating.isLoading ||
        confirming.isLoading ||
        canceling.isLoading ||
        disconnecting.isLoading ||
        configuring.isLoading;
    async function perform(action: () => Promise<unknown>) {
        setError("");
        try {
            await action();
        } catch (problem) {
            setError(message(problem));
        }
    }
    const connect = () =>
        perform(async () => {
            const result = await create().unwrap();
            if (result.url && result.expiresAt) setLink({ url: result.url, expires: result.expiresAt });
        });
    const approve = () =>
        perform(async () => {
            if (!state?.confirmationId) return;
            await confirm({ confirmTelegramRequest: { confirmationId: state.confirmationId } }).unwrap();
            setLink(null);
        });
    const cancelLink = () =>
        perform(async () => {
            await cancel().unwrap();
            setLink(null);
        });
    const unlink = () =>
        perform(async () => {
            await disconnect().unwrap();
            setLink(null);
        });
    const toggle = (enabled: boolean) =>
        perform(() => configure({ saveTelegramRequest: { chatId: settings?.chatId ?? "", enabled } }).unwrap());
    const active = !!link && new Date(link.expires).getTime() > Date.now() && !!state?.pendingUntil;
    return {
        state,
        settings,
        link: active ? link : null,
        error: error || (loadError ? message(loadError) : ""),
        busy,
        creating: creating.isLoading,
        connect,
        approve,
        cancelLink,
        unlink,
        toggle
    };
}
