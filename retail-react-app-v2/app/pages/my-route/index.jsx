/*

 * Copyright (c) 2023, salesforce.com, inc.

 * All rights reserved.

 * SPDX-License-Identifier: BSD-3-Clause

 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause

 */

 

import axios from 'axios'

import React from 'react'

import { useShopperLoginMutation, useCustomerId } from '@salesforce/commerce-sdk-react'

import { useCurrentBasket } from '@salesforce/retail-react-app/app/hooks/use-current-basket'

// import { useCommerceApi } from '@salesforce/commerce-sdk-react'

import { useMutation } from 'react-query';

import { QueryClient, QueryClientProvider } from 'react-query';

import { ShopperBaskets } from "commerce-sdk-isomorphic";

import {
    
    useShopperBasketsMutation
} from '@salesforce/commerce-sdk-react'

const MyNewRoute = () => {

 

    // const shook = useShopperLoginMutation('getTrustedAgentAccessToken')

 

    const customerId = useCustomerId()

    /****************************** Basket *********************************/

    const { data: basket, isLoading } = useCurrentBasket()

 

    console.log("customer", customerId)

  //  console.log("basket", basket)

 
    const updateBasket = useShopperBasketsMutation('updateBasket')
    
    const handleChange = async (e) => {
        await updateBasket.mutateAsync({

            parameters: { basketId: basket.basketId },

            body: {taxTotal:20.5}

        })
        console.log(basket)
      };
 


    return (
        <>
        <button type="submit" id="button" onClick={handleChange}  >Submit</button> 
       
        <h1 style={{ textAlign: 'center', fontSize: '4rem' }}>

          


                dummyRequest

          
        </h1>

        </>
    )

}

 



 

export default MyNewRoute