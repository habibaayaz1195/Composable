import React, { useState,useEffect } from 'react'
import fetch from 'cross-fetch'


import { app } from "../../../config/default";
import {useQuery} from '@tanstack/react-query'
import {useParams} from 'react-router-dom'
import {HTTPError} from '@salesforce/pwa-kit-react-sdk/ssr/universal/errors'
import { getAppOrigin } from 'pwa-kit-react-sdk/utils/url';
const ContentDetails = () => {
    const params = useParams()

    
    
    const {data, error, isLoading} = useQuery({
        queryKey: [params.id],
        queryFn: () => { return fetch(`${getAppOrigin()}/mobify/proxy/ocapi/s/RefArch/dw/shop/v20_2/content/${params.id}?client_id=78a1847b-0d36-4e48-8005-f2d981d1b318`).then(res=>res.json()).then((json) => {
            console.log(json)
            return json
          })
        },
        cacheTime: 0
    })
    
    if (isLoading) {
        return <div>Loading...</div>
    }
    else if (error) {
        return <div>Error query hit: {error}</div>
    } else if (data.fault) {
        throw new HTTPError(404, data.fault.message)
    } else {
        return <div dangerouslySetInnerHTML={{__html: data.c_body}} />
    }
}

ContentDetails.getTemplateName = () => 'content-details'

export default ContentDetails