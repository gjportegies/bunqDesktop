import Logger from "../Helpers/Logger";
import BunqErrorHandler from "../Helpers/BunqErrorHandler";
import { applicationSetStatus } from "./application";
import { openSnackbar } from "./snackbar";
import { userSetInfo } from "./user";
import { loadStoredPayments } from "./payments";
import { loadStoredAccounts } from "./accounts";
import { loadStoredBunqMeTabs } from "./bunq_me_tabs";
import { loadStoredMasterCardActions } from "./master_card_actions";
import { loadStoredRequestInquiries } from "./request_inquiries";
import { loadStoredrequestInquiryBatches } from "./request_inquiry_batches";
import { loadStoredRequestResponses } from "./request_responses";
import { loadStoredContacts } from "./contacts";
import { loadStoredShareInviteBankResponses } from "./share_invite_bank_responses";
import { loadStoredShareInviteBankInquiries } from "./share_invite_bank_inquiries";
import { loadPendingPayments } from "./pending_payments";

/**
 * Logs out of current account and logs back in to the selected stored key
 * @param storedKeyIndex
 * @param derivedPassword
 * @param derivedPasswordIdentifier
 * @returns {Function}
 */
export function registrationSwitchKeys(storedKeyIndex, derivedPassword, derivedPasswordIdentifier) {
    const BunqDesktopClient = window.BunqDesktopClient;
    return async dispatch => {
        dispatch(registrationResetToLogin());
        setTimeout(() => {
            // TODO set the password into bunqdesktop client
            setTimeout(() => {
                // TODO switch the api key
            }, 1000);
        }, 500);
    };
}

export function registrationLoadStoredData(BunqJSClient) {
    return dispatch => {
        dispatch(loadStoredAccounts(BunqJSClient));
        dispatch(loadStoredContacts(BunqJSClient));
        dispatch(loadPendingPayments(BunqJSClient));
        dispatch(loadStoredPayments(BunqJSClient));
        dispatch(loadStoredBunqMeTabs(BunqJSClient));
        dispatch(loadStoredMasterCardActions(BunqJSClient));
        dispatch(loadStoredRequestInquiries(BunqJSClient));
        dispatch(loadStoredrequestInquiryBatches(BunqJSClient));
        dispatch(loadStoredRequestResponses(BunqJSClient));
        dispatch(loadStoredShareInviteBankResponses(BunqJSClient));
        dispatch(loadStoredShareInviteBankInquiries(BunqJSClient));
    };
}

export function registrationLogin(
    BunqJSClient,
    apiKey = false,
    deviceName = false,
    environment = false,
    permittedIps = []
) {
    console.log(apiKey, deviceName, environment, permittedIps);

    const BunqDesktopClient = window.BunqDesktopClient;
    const t = window.t;
    return async dispatch => {
        const statusMessage2 = t("Registering our encryption keys");
        const statusMessage3 = t("Installing this device");
        const statusMessage4 = t("Creating a new session");
        const statusMessage = t("Attempting to load your API key");

        console.count("registrationLogin");

        dispatch(registrationLoading());

        if (!apiKey) {
            console.log(2);
            dispatch(applicationSetStatus(statusMessage));
            if (BunqDesktopClient.derivedPassword) {
                console.log(3);
                try {
                    const hasStoredApiKey = await BunqDesktopClient.loadApiKey();
                    console.log(4, hasStoredApiKey);
                    if (!hasStoredApiKey) {
                        console.log(5);
                        // no given key and no stored key
                        dispatch(registrationNotLoading());
                        dispatch(registrationSetNotReady());
                        return;
                    }
                    apiKey = hasStoredApiKey;
                } catch (exception) {
                    console.error(5, "ex", exception);
                    dispatch(registrationResetToLoginPassword());
                    dispatch(registrationNotLoading());
                    dispatch(registrationSetNotReady());
                    return;
                }
            } else {
                console.log(6);
                dispatch(registrationNotLoading());
                dispatch(registrationSetNotReady());
                return;
            }

            console.log(7);

            // set the loaded data in registration storage
        } else {
            console.log(8);
            await BunqDesktopClient.setupNewApiKey(apiKey, deviceName, environment, permittedIps);
        }

        try {
            console.log(9);
            await BunqDesktopClient.BunqJSClientRun();

            dispatch(applicationSetStatus(statusMessage2));
            await BunqDesktopClient.BunqJSClientInstall();

            dispatch(applicationSetStatus(statusMessage3));
            await BunqDesktopClient.BunqJSClientRegisterDevice();

            dispatch(applicationSetStatus(statusMessage4));
            await BunqDesktopClient.BunqJSClientRegisterSession();

            const users = await BunqDesktopClient.BunqJSClientRegisterGetUsers();
            const userType = Object.keys(users)[0];
            dispatch(userSetInfo(users[userType], userType));

            // load bunq api data and other data like contacts from storage
            dispatch(registrationLoadStoredData(BunqJSClient));
        } catch (exception) {
            console.error(9, "ex", exception);
            BunqErrorHandler(dispatch, exception, false, BunqJSClient);
            dispatch(registrationResetToLogin());
            dispatch(registrationNotLoading());
            dispatch(registrationSetNotReady());
            return;
        }

        setTimeout(() => {
            dispatch(applicationSetStatus(""));
            dispatch(registrationNotLoading());
            dispatch(registrationSetBunqDesktopClientData());
            dispatch(registrationSetReady());
        }, 500);
    };
}

/**
 * Removes a stored api key
 * @param index
 * @returns {{type: string, payload: {index: *}}}
 */
export function registrationRemoveStoredApiKey(index) {
    const BunqDesktopClient = window.BunqDesktopClient;

    BunqDesktopClient.removeStoredApiKey(index);
    return {
        type: "REGISTRATION_REMOVE_STORED_API_KEY",
        payload: {
            stored_api_keys: BunqDesktopClient.storedApiKeys
        }
    };
}

/**
 * Only resets api key in memory, returns the client back to Login page
 * @returns {function(*)}
 */
export function registrationResetToLogin() {
    const BunqDesktopClient = window.BunqDesktopClient;
    return dispatch => {
        BunqDesktopClient.destroyApiSession(true).then(_ => {
            dispatch({
                type: "REGISTRATION_RESET_TO_LOGIN"
            });
        });
    };
}

/**
 * Log out without removing the stored apikey
 * @param resetPassword
 * @returns {function(*)}
 */
export function registrationLogOut(resetPassword = false) {
    const BunqDesktopClient = window.BunqDesktopClient;
    return dispatch => {
        BunqDesktopClient.destroyApiSession(true).then(_ => {
            dispatch({
                type: "REGISTRATION_LOG_OUT",
                payload: {
                    resetPassword: resetPassword
                }
            });
        });
    };
}

/**
 * Remove all api keys, passwords and other private data
 * @param resetPassword
 * @returns {function(*)}
 */
export function registrationClearPrivateData() {
    const BunqDesktopClient = window.BunqDesktopClient;
    return dispatch => {
        BunqDesktopClient.destroySession().then(_ => {
            dispatch({
                type: "REGISTRATION_CLEAR_PRIVATE_DATA"
            });
        });
    };
}

/**
 * Sets the stored api keys list
 * @param storedApiKeys
 * @returns {{type: string, payload: {stored_api_keys: StoredApiKey[]}}}
 */
export function registrationSetStoredApiKeys(storedApiKeys) {
    const BunqDesktopClient = window.BunqDesktopClient;

    BunqDesktopClient.setStoredApiKeys(storedApiKeys);
    return {
        type: "REGISTRATION_SET_STORED_API_KEYS",
        payload: {
            stored_api_keys: BunqDesktopClient.storedApiKeys
        }
    };
}

/**
 * Clear all user info currently in the application
 * @returns {{type: string}}
 */
export function registrationClearUserInfo() {
    return {
        type: "REGISTRATION_CLEAR_USER_INFO"
    };
}

/**
 * Generic registration ready state
 * @returns {{type: string}}
 */
export function registrationSetReady() {
    return {
        type: "REGISTRATION_READY"
    };
}

/**
 * Generic registration not ready state
 * @returns {{type: string}}
 */
export function registrationSetNotReady() {
    return {
        type: "REGISTRATION_NOT_READY"
    };
}

/**
 * Generic registration loading state
 * @returns {{type: string}}
 */
export function registrationLoading() {
    return {
        type: "REGISTRATION_LOADING"
    };
}

/**
 * Generic registration not loading state
 * @returns {{type: string}}
 */
export function registrationNotLoading() {
    return {
        type: "REGISTRATION_NOT_LOADING"
    };
}

// export const registrationNEWSwitchStoredApiKey = keyIndex => {
//     const BunqDesktopClient = window.BunqDesktopClient;
//     const t = window.t;
//     const statusMessage = t("Attempting to load your API key");
//     const failedLoadingMessage = t("We failed to load the stored API key Try again or re-enter the key");
//
//     return dispatch => {
//         dispatch(registrationLoading());
//         dispatch(applicationSetStatus(statusMessage));
//         BunqDesktopClient.switchStoredApiKey(keyIndex)
//             .then(done => {
//                 dispatch(registrationNotLoading());
//                 console.log("Done switchStoredApiKey", done);
//             })
//             .catch(error => {
//                 dispatch(registrationNotLoading());
//                 console.error("Error switchStoredApiKey", error);
//
//                 dispatch(registrationNotLoading());
//                 dispatch(registrationResetToLogin());
//                 dispatch(registrationSetNotReady());
//                 dispatch(openSnackbar(failedLoadingMessage));
//             });
//     };
// };

export const registrationNEWSetPassword = password => {
    const BunqDesktopClient = window.BunqDesktopClient;
    const t = window.t;
    // TODO password error message
    // const failedLoadingMessage = t("Failed to set hte password");

    return dispatch => {
        dispatch(registrationLoading());
        BunqDesktopClient.setupPassword(password)
            .then(done => {
                dispatch(registrationNotLoading());
                dispatch(registrationSetBunqDesktopClientData());
                console.log("Done setupPassword", done);
            })
            .catch(error => {
                console.error("Error setupPassword", error);

                dispatch(registrationNotLoading());
                dispatch(registrationResetToLogin());
                dispatch(registrationSetNotReady());
                BunqErrorHandler(dispatch, error, false, BunqDesktopClient.BunqJSClient);
            });
    };
};

export const registrationSkipPassword = () => {
    const BunqDesktopClient = window.BunqDesktopClient;
    return dispatch => {
        dispatch(registrationLoading());
        BunqDesktopClient.skipPassword()
            .then(done => {
                dispatch(registrationNotLoading());
                dispatch(registrationSetBunqDesktopClientData());
                console.log("Done skipPassword", done);
            })
            .catch(error => {
                dispatch(registrationNotLoading());
                console.error("Error skipPassword", error);
                BunqErrorHandler(dispatch, error, false, BunqDesktopClient.BunqJSClient);
            });
    };
};

export const registrationSetBunqDesktopClientData = () => {
    const BunqDesktopClient = window.BunqDesktopClient;
    return {
        type: "REGISTRATION_SET_BUNQ_DESKTOP_CLIENT_DATA",
        payload: {
            derived_password: BunqDesktopClient.derivedPassword,
            derived_password_salt: BunqDesktopClient.derivedPasswordSalt,
            identifier: BunqDesktopClient.passwordIdentifier,

            api_key: BunqDesktopClient.apiKey,
            encrypted_api_key: BunqDesktopClient.encryptedApiKey,
            encrypted_api_key_iv: BunqDesktopClient.encryptedApiKeyIv,
            device_name: BunqDesktopClient.deviceName,
            environment: BunqDesktopClient.environment,
            permitted_ips: BunqDesktopClient.permittedIps,

            has_stored_api_key: BunqDesktopClient.hasStoredApiKey,
            stored_api_keys: BunqDesktopClient.storedApiKeys,
            use_no_password: BunqDesktopClient.hasSkippedPassword
        }
    };
};
