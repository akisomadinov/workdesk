import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import {
    useAuthSetupMutation,
    useAuthRegisterMutation,
    useAuthLoginMutation,
    useAuthAcceptMutation,
    useAuthJoinMutation
} from "@/api/autogen/workdesk";
import { api } from "@/api/api";
import { store } from "@/app/store";
import { message } from "@/common/models";
import { loginSchema, registrationSchema } from "./validation";
import type { AccountValues } from "./validation";
import { safeReturnTo } from "./navigation";

export default function useAccountForm(mode: "register" | "login" | "join", setupRequired: boolean) {
    const [joinMode, setJoinMode] = useState<"new" | "existing">("new");
    const creating = mode === "register" || (mode === "join" && joinMode === "new");
    const form = useForm<AccountValues>({
        resolver: zodResolver(creating ? registrationSchema : loginSchema),
        mode: "onBlur",
        defaultValues: { name: "", login: "", email: "", password: "", confirmation: "" }
    });
    const [setup] = useAuthSetupMutation();
    const [register] = useAuthRegisterMutation();
    const [login] = useAuthLoginMutation();
    const [accept] = useAuthAcceptMutation();
    const [join, joinState] = useAuthJoinMutation();
    const [error, setError] = useState("");
    const location = useLocation();
    const navigate = useNavigate();
    const returnTo = safeReturnTo(new URLSearchParams(location.search).get("returnTo"));
    const token = location.hash.slice(1);
    const validInvitation = /^[a-f0-9]{64}$/i.test(token);
    function finish() {
        form.reset();
        store.dispatch(api.util.resetApiState());
        navigate(mode === "join" ? "/team" : returnTo, { replace: true });
    }
    async function submit(values: AccountValues) {
        setError("");
        const credentials = {
            name: creating ? values.name : "",
            login: creating ? values.login : values.email,
            email: creating ? values.email : "",
            password: values.password
        };
        try {
            if (mode === "register")
                await (setupRequired ? setup : register)({ credentialsRequest: credentials }).unwrap();
            else if (mode === "login") await login({ credentialsRequest: credentials }).unwrap();
            else await accept({ acceptInvitationRequest: { ...credentials, token } }).unwrap();
            finish();
        } catch (failure) {
            setError(message(failure));
        }
    }
    async function joinCurrent() {
        setError("");
        try {
            await join({ joinInvitationRequest: { token } }).unwrap();
            finish();
        } catch (failure) {
            setError(message(failure));
        }
    }
    function changeJoinMode(value: "new" | "existing") {
        setJoinMode(value);
        setError("");
        form.reset();
    }
    return {
        form,
        creating,
        joinMode,
        changeJoinMode,
        error,
        submit,
        joinCurrent,
        joining: joinState.isLoading,
        returnTo,
        validInvitation
    };
}
