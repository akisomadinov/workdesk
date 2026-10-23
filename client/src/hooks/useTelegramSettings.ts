import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBeforeUnload } from "react-router-dom";
import { useNotificationsTelegramQuery, useNotificationsConfigureMutation } from "@/api/autogen/workdesk";
import { telegramSchema } from "@/pages/settings/validation";
import type { TelegramValues } from "@/pages/settings/validation";
import { message } from "@/common/models";
export default function useTelegramSettings() {
    const { data: settings, isLoading, error: loadError } = useNotificationsTelegramQuery();
    const [configure] = useNotificationsConfigureMutation();
    const [failure, setFailure] = useState("");
    const [saved, setSaved] = useState(false);
    const form = useForm<TelegramValues>({
        resolver: zodResolver(telegramSchema),
        mode: "onChange",
        defaultValues: { chatId: "", token: "", enabled: false }
    });
    const { isDirty } = form.formState;
    useEffect(() => {
        if (settings && !isDirty)
            form.reset({ chatId: settings.chatId ?? "", token: "", enabled: settings.enabled ?? false });
    }, [settings, form, isDirty]);
    useBeforeUnload((event) => {
        if (isDirty) event.preventDefault();
    });
    const submit = form.handleSubmit(async (values) => {
        setFailure("");
        setSaved(false);
        try {
            const result = await configure({
                saveTelegramRequest: { ...values, token: values.token || null }
            }).unwrap();
            form.reset({ chatId: result.chatId ?? "", token: "", enabled: result.enabled ?? false });
            setSaved(true);
        } catch (problem) {
            setFailure(message(problem));
        }
    });
    return {
        form,
        settings,
        isLoading,
        error: failure || (loadError ? message(loadError) : ""),
        saved: saved && !isDirty,
        submit
    };
}
